# Plan (TL;DR)
# 1) Create lightweight endpoint: GET /api/v1/admin/universities/select
#    - returns [{id,name,code}] for active universities, sorted by name
#    - optional ?q= filter, limit 500, cached with tag "universities"
# 2) Update MajorDialog to fetch from this endpoint on open, show options
#    - remove server action dependency for select list
#    - strict typing, no any

// ----------------------------------------------
// file: src/app/api/v1/admin/universities/select/route.ts
// ----------------------------------------------

// ----------------------------------------------
// file: src/components/admin/majors/major-dialog.tsx
// ----------------------------------------------

