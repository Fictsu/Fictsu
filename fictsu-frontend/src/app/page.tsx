import Link from "next/link"
import Image from "next/image"
import { Fiction } from "@/types/types"

async function getFictions(): Promise<Fiction[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f`, {
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to fetch fictions")
  }

  return res.json()
}

function FictionCard({ fiction }: { fiction: Fiction }) {
  return (
    <Link
      href={`/f/${fiction.id}`}
      className="group block w-52 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1 m-0 p-0"
    >
      {/* Cover Image */}
      <div className="relative w-full h-72">
        <Image
          src={fiction.cover || "/default-cover.png"}
          alt={fiction.title}
          layout="fill"
          objectFit="cover"
          className="rounded-t-lg"
        />
      </div>
      {/* Title and Contributor */}
      <div className="p-4 bg-white dark:bg-gray-900 h-full">
        {/* Title with truncation */}
        <h2 className="text-sm font-semibold group-hover:text-blue-500 transition truncate" style={{ maxWidth: '100%' }}>
          {fiction.title}
        </h2>

        {/* Contributor */}
        <p className="text-xs text-gray-700 dark:text-gray-300">
          ✍️ {fiction.contributor_name}
        </p>
      </div>
    </Link>
  )
}

export default async function HomePage() {
  const fictions = await getFictions()

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-center mb-8">📖 Fictsu Fictions</h1>

      {fictions.length === 0 ? (
        <p className="text-center text-gray-500">No fictions available.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0">
          {fictions.map((fiction) => (
            <FictionCard key={fiction.id} fiction={fiction} />
          ))}
        </div>
      )}
    </div>
  )
}
