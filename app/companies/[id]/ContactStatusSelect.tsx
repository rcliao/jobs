'use client'

import { useRef } from 'react'

interface ContactStatusSelectProps {
  contactId: string
  companyId: string
  defaultValue: string
  action: (formData: FormData) => void
}

export function ContactStatusSelect({
  contactId,
  companyId,
  defaultValue,
  action
}: ContactStatusSelectProps) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={action} className="flex gap-1">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="companyId" value={companyId} />
      <select
        name="outreachStatus"
        defaultValue={defaultValue}
        onChange={() => formRef.current?.requestSubmit()}
        className="text-xs border border-gray-200 rounded px-2 py-1"
      >
        <option value="not_contacted">Not Contacted</option>
        <option value="contacted">Contacted</option>
        <option value="responded">Responded</option>
        <option value="rejected">Rejected</option>
      </select>
    </form>
  )
}
