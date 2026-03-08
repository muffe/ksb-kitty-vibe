# KSB Katzenstation

Interne Nuxt-4-Anwendung für Katzenraum-Management mit Nuxt UI und Supabase.

## Funktionen

- Deutsche Oberfläche für Mitarbeitende und Admins
- HTTP Basic Auth vor der gesamten App
- Raumverwaltung mit Reihenfolge, Warnhinweisen und Fütterungsangaben
- Automatische Historie für Futteränderungen mit Wiederverwendung alter Einträge
- Protokolle für Morgen- und Abendrunden mit Kot-Dokumentation
- Dashboard mit Raumanzahl, Warnhinweisen und letzten Einträgen

## Zugriff

- Basic Auth:
  `ksb` / `ksb`
- Admin-Zugang:
  Supabase Auth per E-Mail + Passwort

Nur angemeldete Admins dürfen Räume bearbeiten. Reguläre Mitarbeitende können nach dem Basic-Auth-Zugang direkt Protokolle schreiben.

## Setup

```bash
bun install
bun run dev
```

Die App nutzt standardmäßig die bereits hinterlegte Supabase-URL und den öffentlichen Anon-Key. Bei Bedarf können sie über `.env` überschrieben werden:

```bash
cp .env.example .env
```

## Supabase-Hinweise

Das Datenmodell wurde bereits per Migration angelegt:

- `rooms`
- `room_feeding_history`
- `room_logs`

Die Futterhistorie wird per Datenbank-Trigger automatisch geschrieben, sobald Admins Raum-Futterangaben ändern.

## Admin-Konten

Die App erstellt keine Admin-Benutzer selbst. Admins müssen in Supabase Auth als E-Mail/Passwort-Benutzer angelegt werden. Da nur diese Benutzer Admin-Logins erhalten, dürfen alle authentifizierten Supabase-User Räume verwalten.
