"""
Role catalogue. Permission codes follow Karizma One's `module.action` convention.
Business modules (clients, dossiers, devis, factures, paiements, stock…) are open to every company member;
only the codes below are restricted. Validate the `user` role's access with the garage before adding codes.
"""

ROLE_CHOICES = [('admin', 'Administrateur'), ('user', 'Utilisateur')]

PERMISSIONS = {
    'settings.view': 'Voir les paramètres du garage',
    'settings.edit': 'Modifier les paramètres du garage',
    'referentials.edit': 'Gérer les compagnies d’assurance et les experts',
    'users.view': 'Voir les utilisateurs de l’entreprise',
}

ROLE_PERMISSIONS = {
    'admin': set(PERMISSIONS),
    'user': set(),
}


def role_permissions(role):
    return sorted(ROLE_PERMISSIONS.get(role, set()))
