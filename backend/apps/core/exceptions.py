import logging

from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)
GENERIC = 'Une erreur inattendue est survenue. Réessayez ou contactez le support.'


def api_exception_handler(exc, context):
    """Like Karizma One's handler: DRF errors pass through; unexpected errors become a generic 500 without leaking details."""
    response = exception_handler(exc, context)
    if response is None:
        logger.exception('Unhandled API error', exc_info=exc)
        from rest_framework.response import Response
        return Response({'detail': GENERIC}, status=500)
    return response
