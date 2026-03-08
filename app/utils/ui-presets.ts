export const readableInputUi = {
  base: 'bg-white/96 text-[var(--surface-ink)] ring-[var(--ui-border-accented)] placeholder:text-[var(--surface-muted)] shadow-sm focus:bg-white',
  leadingIcon: 'text-[var(--surface-muted)]',
  trailingIcon: 'text-[var(--surface-muted)]'
}

export const readableTextareaUi = {
  base: 'bg-white/96 text-[var(--surface-ink)] ring-[var(--ui-border-accented)] placeholder:text-[var(--surface-muted)] shadow-sm focus:bg-white',
  leadingIcon: 'text-[var(--surface-muted)]',
  trailingIcon: 'text-[var(--surface-muted)]'
}

export const readableSelectUi = {
  base: 'bg-white/96 text-[var(--surface-ink)] ring-[var(--ui-border-accented)] shadow-sm hover:bg-white focus:bg-white',
  value: 'text-[var(--surface-ink)]',
  placeholder: 'text-[var(--surface-muted)]',
  trailingIcon: 'text-[var(--surface-muted)]',
  content: 'bg-white/98 ring-[var(--ui-border-accented)] shadow-xl',
  viewport: 'divide-[var(--ui-border)]',
  item: 'text-[var(--surface-ink)] data-highlighted:not-data-disabled:text-[var(--surface-ink)] data-highlighted:not-data-disabled:before:bg-[rgba(21,167,159,0.12)]',
  itemLeadingIcon: 'text-[var(--surface-muted)] group-data-highlighted:not-group-data-disabled:text-[var(--surface-ink)]',
  itemDescription: 'text-[var(--surface-muted)]',
  label: 'text-[var(--surface-ink)]'
}

export const readableCheckboxCardUi = {
  root: 'rounded-[1.2rem] border-[var(--ui-border-accented)] bg-white/92 shadow-sm hover:bg-white has-data-[state=checked]:bg-[rgba(21,167,159,0.08)] has-data-[state=checked]:border-[rgba(21,167,159,0.55)]',
  base: 'ring-[var(--ui-border-accented)] bg-white',
  label: 'text-[var(--surface-ink)] text-sm font-semibold',
  description: 'mt-1 text-[var(--surface-muted)] text-sm leading-5'
}
