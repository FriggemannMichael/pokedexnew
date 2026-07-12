from django.contrib import admin

from .models import CachedResource


@admin.register(CachedResource)
class CachedResourceAdmin(admin.ModelAdmin):
    """Zeigt den PokeAPI-Cache im Django-Admin an."""

    list_display = ["path", "fetched_at"]
    search_fields = ["path"]
    readonly_fields = ["path", "payload", "fetched_at"]
