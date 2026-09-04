# Auth Company Register — Plan Brief

> Full plan: `context/changes/auth-company-register/plan.md`

## What & Why

Complete FR-001 signup (without logo) so a company account exists in Postgres and the navbar can show the company name.

## Starting Point

Login/session works; `/me` returns `company: null`; register UI is a stub.

## Desired End State

POST register → Auth user + companies row → auto-login → navbar = company name.

## Key Decisions

| Decision | Choice | Source |
| -------- | ------ | ------ |
| Location | free-text `base_location` | Umbrella |
| Photo | nullable columns only | Umbrella |
| Create user | Nest via supabase-js signUp (anon) + insert with user JWT | Plan (no service role required if confirm email off) |

## Scope

In: schema, register, /me company, FE wire  
Out: R2 logo

## Phases

1. Schema + Nest  
2. FE + navbar name
