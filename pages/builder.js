import { useState } from "react";

export default function Builder() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/generate-site", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error generating site:", err);
      setResult("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>VibeScript Website Builder</h1>
      <textarea
        placeholder="Describe your website idea here..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      <button onClick={handleGenerate} disabled={loading || !prompt}>
        {loading ? "Generating..." : "Generate Website"}
      </button>
      {result && (
        <pre style={{ marginTop: "2rem", background: "#eee", padding: "1rem" }}>
          {result}
        </pre>
      )}
    </div>
  );
}
