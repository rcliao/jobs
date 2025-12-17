'use client'

interface CopyEmailButtonProps {
  email: string
}

export function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(email)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded hover:bg-gray-700"
      title="Copy email"
    >
      Copy Email
    </button>
  )
}
