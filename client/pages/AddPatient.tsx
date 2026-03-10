import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default function AddPatient() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [ipp, setIpp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [condition, setCondition] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      age: age === "" ? null : Number(age),
      gender,
      ipp: ipp.trim() || undefined,
      birthDate: birthDate || undefined,
      status,
      condition,
    };
    const res = await apiFetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const { id } = await res.json();
      // après création, rediriger vers la fiche ou revenir au dashboard
      navigate(`/patient/${id}`);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Add Patient</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="IPP / MRN"
            value={ipp}
            onChange={(e) => setIpp(e.target.value)}
          />
          <Input
            type="date"
            placeholder="Date of birth"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <Input
            placeholder="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          />
          <label className="block text-sm font-medium text-foreground">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <Input
            placeholder="Condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" variant="default">
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
