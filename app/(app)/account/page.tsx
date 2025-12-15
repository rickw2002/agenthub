import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Account</h1>
      <p className="text-gray-500">Account placeholder</p>
      {session && (
        <div className="mt-4">
          <p className="text-gray-600">Naam: {session.user.name}</p>
          <p className="text-gray-600">Email: {session.user.email}</p>
        </div>
      )}
    </div>
  );
}






