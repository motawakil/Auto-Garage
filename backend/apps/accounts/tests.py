from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.clients.models import Client, Vehicle
from apps.repairs.models import InsuranceCompany
from .models import Company, Membership

PASSWORD = 'Un-Mot-De-Passe-Solide-42'
ACCESS = settings.AUTH_COOKIES['access']['name']
REFRESH = settings.AUTH_COOKIES['refresh']['name']


def make_login(company, email, role='user'):
    user = get_user_model().objects.create_user(username=email, email=email, password=PASSWORD)
    Membership.objects.create(user=user, company=company, role=role)
    return user


class BaseCase(TestCase):
    def setUp(self):
        cache.clear()
        self.a = Company.objects.create(name='Garage A')
        self.b = Company.objects.create(name='Garage B')
        make_login(self.a, 'admin@a.ma', 'admin')
        make_login(self.a, 'user@a.ma', 'user')
        make_login(self.b, 'admin@b.ma', 'admin')
        self.client_b = Client.objects.create(company=self.b, last_name='Client B', phone='0600000002')
        self.vehicle_b = Vehicle.objects.create(company=self.b, client=self.client_b, brand='Dacia', model='Logan', plate='22222-B-6')

    def login(self, email):
        api = APIClient()
        res = api.post('/api/auth/login/', {'email': email, 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        return api


class AuthenticationTests(BaseCase):
    def test_api_requires_authentication(self):
        self.assertIn(APIClient().get('/api/clients/').status_code, (401, 403))

    def test_login_sets_httponly_cookies_and_no_token_in_body(self):
        api = APIClient()
        res = api.post('/api/auth/login/', {'email': 'ADMIN@a.ma', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('access', res.data)
        self.assertTrue(res.cookies[ACCESS]['httponly'])
        self.assertTrue(res.cookies[REFRESH]['httponly'])
        self.assertEqual(res.data['company']['name'], 'Garage A')
        self.assertEqual(res.data['role'], 'admin')

    def test_wrong_password_then_lockout(self):
        api = APIClient()
        for _ in range(settings.LOGIN_MAX_ATTEMPTS):
            self.assertEqual(api.post('/api/auth/login/', {'email': 'user@a.ma', 'password': 'faux'}, format='json').status_code, 401)
        res = api.post('/api/auth/login/', {'email': 'user@a.ma', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_refresh_rotates_and_blacklists_old_token(self):
        api = self.login('user@a.ma')
        old = api.cookies[REFRESH].value
        self.assertEqual(api.post('/api/auth/refresh/').status_code, 200)
        self.assertNotEqual(api.cookies[REFRESH].value, old)
        replay = APIClient()
        replay.cookies[REFRESH] = old
        self.assertEqual(replay.post('/api/auth/refresh/').status_code, 401)

    def test_logout_revokes_refresh_token(self):
        api = self.login('user@a.ma')
        token = api.cookies[REFRESH].value
        self.assertEqual(api.post('/api/auth/logout/').status_code, 204)
        replay = APIClient()
        replay.cookies[REFRESH] = token
        self.assertEqual(replay.post('/api/auth/refresh/').status_code, 401)

    def test_disabled_company_cannot_login(self):
        self.b.is_active = False
        self.b.save()
        res = APIClient().post('/api/auth/login/', {'email': 'admin@b.ma', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_csrf_enforced_with_cookie_auth(self):
        api = self.login('user@a.ma')
        strict = APIClient(enforce_csrf_checks=True)
        strict.cookies = api.cookies
        res = strict.post('/api/clients/', {'last_name': 'X', 'phone': '0611111111'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_change_password_validates_current_password(self):
        api = self.login('user@a.ma')
        res = api.post('/api/auth/password/', {'current_password': 'faux', 'new_password': 'Nouveau-Mot-De-Passe-99'}, format='json')
        self.assertEqual(res.status_code, 400)
        res = api.post('/api/auth/password/', {'current_password': PASSWORD, 'new_password': 'Nouveau-Mot-De-Passe-99'}, format='json')
        self.assertEqual(res.status_code, 200)


class IsolationTests(BaseCase):
    def test_list_only_returns_own_company(self):
        api = self.login('admin@a.ma')
        Client.objects.create(company=self.a, last_name='Client A', phone='0600000001')
        names = [c['last_name'] for c in api.get('/api/clients/').data['results']]
        self.assertEqual(names, ['Client A'])

    def test_cannot_read_or_modify_other_company_record(self):
        api = self.login('admin@a.ma')
        self.assertEqual(api.get(f'/api/clients/{self.client_b.pk}/').status_code, 404)
        self.assertEqual(api.patch(f'/api/clients/{self.client_b.pk}/', {'last_name': 'Pirate'}, format='json').status_code, 404)
        self.client_b.refresh_from_db()
        self.assertEqual(self.client_b.last_name, 'Client B')

    def test_cannot_reference_other_company_record(self):
        api = self.login('admin@a.ma')
        client_a = api.post('/api/clients/', {'last_name': 'A', 'phone': '0600000009'}, format='json').data
        res = api.post('/api/repair-orders/', {'client': client_a['id'], 'vehicle': self.vehicle_b.pk,
                                               'entry_date': '2026-10-28'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('vehicle', res.data)

    def test_created_records_belong_to_user_company(self):
        api = self.login('admin@a.ma')
        res = api.post('/api/clients/', {'last_name': 'Nouveau', 'phone': '0600000010'}, format='json')
        self.assertEqual(Client.objects.get(pk=res.data['id']).company, self.a)

    def test_same_plate_allowed_in_two_companies_but_not_twice_in_one(self):
        api = self.login('admin@a.ma')
        client_a = api.post('/api/clients/', {'last_name': 'A', 'phone': '0600000011'}, format='json').data
        payload = {'client': client_a['id'], 'brand': 'Dacia', 'model': 'Logan', 'plate': '22222-B-6'}
        self.assertEqual(api.post('/api/vehicles/', payload, format='json').status_code, 201)
        self.assertEqual(api.post('/api/vehicles/', payload, format='json').status_code, 400)

    def test_dashboard_and_search_are_scoped(self):
        api = self.login('admin@a.ma')
        self.assertEqual(api.get('/api/dashboard/').data['counts']['clients'], 0)
        self.assertEqual(api.get('/api/search/', {'q': 'Client B'}).data, [])


class RoleTests(BaseCase):
    def test_user_cannot_edit_settings_but_can_read_them(self):
        api = self.login('user@a.ma')
        self.assertEqual(api.get('/api/settings/').status_code, 200)
        self.assertEqual(api.patch('/api/settings/', {'name': 'X'}, format='json').status_code, 403)

    def test_admin_can_edit_settings(self):
        api = self.login('admin@a.ma')
        self.assertEqual(api.patch('/api/settings/', {'name': 'Garage A+'}, format='json').status_code, 200)

    def test_referentials_read_for_all_write_for_admin(self):
        user, admin = self.login('user@a.ma'), self.login('admin@a.ma')
        self.assertEqual(user.get('/api/insurers/').status_code, 200)
        self.assertEqual(user.post('/api/insurers/', {'name': 'RMA'}, format='json').status_code, 403)
        self.assertEqual(admin.post('/api/insurers/', {'name': 'RMA'}, format='json').status_code, 201)
        self.assertEqual(InsuranceCompany.objects.get().company, self.a)

    def test_users_list_is_admin_only_and_scoped(self):
        self.assertEqual(self.login('user@a.ma').get('/api/auth/users/').status_code, 403)
        emails = {u['email'] for u in self.login('admin@a.ma').get('/api/auth/users/').data}
        self.assertEqual(emails, {'admin@a.ma', 'user@a.ma'})

    def test_me_exposes_role_permissions(self):
        self.assertEqual(self.login('user@a.ma').get('/api/auth/me/').data['permissions'], [])
        self.assertIn('settings.edit', self.login('admin@a.ma').get('/api/auth/me/').data['permissions'])
