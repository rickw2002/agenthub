import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Agent niet gevonden</h1>
      <p className="text-gray-600 mb-6">
        De agent die je zoekt bestaat niet of is niet meer beschikbaar.
      </p>
      <Link
        href="/agents"
        className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
      >
        Terug naar agents overzicht
      </Link>
    </div>
  );
}









