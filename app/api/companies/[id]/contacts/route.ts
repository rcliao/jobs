import { NextRequest, NextResponse } from 'next/server'
import { getCompany, getCompanyContacts, updateContact } from '@/lib/db/company-queries'
import type { ContactType } from '@/types'

// GET /api/companies/[id]/contacts - Get company contacts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const contactType = searchParams.get('type') as ContactType | null

    const company = getCompany(id)
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    const contacts = getCompanyContacts(id, contactType || undefined)

    // Group by contact type
    const contactsByType: Record<string, typeof contacts> = {}
    for (const contact of contacts) {
      if (!contactsByType[contact.contactType]) {
        contactsByType[contact.contactType] = []
      }
      contactsByType[contact.contactType].push(contact)
    }

    return NextResponse.json({
      companyId: id,
      companyName: company.name,
      totalContacts: contacts.length,
      contacts: contactType ? contacts : undefined,
      contactsByType: contactType ? undefined : contactsByType
    })
  } catch (error) {
    console.error('Error getting company contacts:', error)
    return NextResponse.json(
      { error: 'Failed to get company contacts' },
      { status: 500 }
    )
  }
}

// PATCH /api/companies/[id]/contacts - Update a contact (pass contactId in body)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { contactId, outreachStatus, notes, lastContactedAt } = body

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId is required' },
        { status: 400 }
      )
    }

    const company = getCompany(id)
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    const updated = updateContact(contactId, {
      outreachStatus,
      notes,
      lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : undefined
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}
