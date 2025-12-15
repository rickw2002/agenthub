import MasterChat from "@/components/MasterChat";

export default function CopilotPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Copilot</h1>
        <p className="text-gray-600">
          Stel korte, concrete vragen. Copilot gebruikt automatisch je
          workspace-context en antwoordt in het Nederlands.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <MasterChat mode="copilot" />
      </div>
    </div>
  );
}

