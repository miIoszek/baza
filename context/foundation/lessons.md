# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Always lock form-field validation with FE, BE, and DB in mind

- **Context**: when working with form fields
- **Problem**: we create form fields with messy or missing validation — for example no max length, and no error messages under fields
- **Rule**: Always verify and ask for field validation; suggest concrete validations; remember data is saved in the DB, so constrain length/type there too
- **Applies to**: plan, plan-review, implement, impl-review
