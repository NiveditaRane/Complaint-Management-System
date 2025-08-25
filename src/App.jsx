import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";
import abi from "./abi.json";


// ✅ your deployed address
const contractAddress = "0x4a8D2B518d94279C0866Bc0225bE22a90e37bFd9";

// enum label maps to show human-readable values
const STATUS = ["Filed", "InReview", "Assigned", "Resolved", "Rejected", "Escalated", "Closed"];
const PRIORITY = ["Low", "Medium", "High", "Urgent"];

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const [title, setTitle] = useState("");
  const [detailsHash, setDetailsHash] = useState("");
  const [deptId, setDeptId] = useState(1);
  const [priority, setPriority] = useState(0);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  // connect wallet + instantiate contract
  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install/enable MetaMask");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts[0];

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const c = new ethers.Contract(contractAddress, abi, signer);

      setAccount(addr);
      setContract(c);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  // auto-detect account / chain changes
  useEffect(() => {
    if (typeof window.ethereum === "undefined") return;
    const onAccounts = (accs) => setAccount(accs[0] || null);
    const onChain = () => window.location.reload();

    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);

    // optional: silently connect if already authorized
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accs) => accs[0] && connectWallet())
      .catch(() => {});

    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  // file a complaint
  const fileComplaint = async () => {
    if (!contract) return alert("Connect your wallet first!");
    if (!title.trim() || !detailsHash.trim()) {
      alert("Please enter Title and Details IPFS Hash");
      return;
    }
    try {
      setLoading(true);
      const tx = await contract.fileComplaint(
        Number(deptId),         // uint16
        Number(priority),       // enum underlying is uint8
        title,
        detailsHash,
        []                      // evidence CIDs (empty now)
      );
      await tx.wait();
      setTitle("");
      setDetailsHash("");
      await fetchMyComplaints();
      alert("Complaint filed successfully!");
    } catch (err) {
      console.error(err);
      alert(err?.reason || "Failed to file complaint");
    } finally {
      setLoading(false);
    }
  };

  // fetch all complaints for connected user
  const fetchMyComplaints = async () => {
    if (!contract || !account) return;
    try {
      setLoading(true);
      const ids = await contract.complaintsOf(account); // array of BigInt
      const list = [];

      for (const id of ids) {
        const comp = await contract.getComplaint(id);
        // comp has named fields: id, complainant, departmentId, priority, status, title, detailsHash, ...
        // Normalize for rendering
        list.push({
          id: comp.id?.toString?.() ?? comp[0]?.toString?.(),
          title: comp.title ?? comp[5],
          departmentId: Number(comp.departmentId ?? comp[2]),
          status: Number(comp.status ?? comp[4]),
          priority: Number(comp.priority ?? comp[3]),
          createdAt: Number(comp.createdAt ?? comp[9]),
        });
      }

      // newest first (optional)
      list.sort((a, b) => Number(b.id) - Number(a.id));
      setComplaints(list);
    } catch (err) {
      console.error("Fetch complaints failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // refresh when connected
  useEffect(() => {
    if (account && contract) fetchMyComplaints();
  }, [account, contract]);

  return (
    <div className="container">
      <h1>Smart Complaint Management</h1>

      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>Connected: {account}</p>
      )}

      <h2>File a Complaint</h2>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="Details IPFS Hash"
        value={detailsHash}
        onChange={(e) => setDetailsHash(e.target.value)}
      />
      <select value={deptId} onChange={(e) => setDeptId(Number(e.target.value))}>
        <option value={1}>Sanitation</option>
        <option value={2}>Roads</option>
        <option value={3}>Water</option>
      </select>
      <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
        <option value={0}>Low</option>
        <option value={1}>Medium</option>
        <option value={2}>High</option>
        <option value={3}>Urgent</option>
      </select>
      <button disabled={loading || !account} onClick={fileComplaint}>
        {loading ? "Submitting..." : "Submit Complaint"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ marginBottom: 0 }}>My Complaints</h2>
        <button onClick={fetchMyComplaints} disabled={!account || loading}>
          Refresh
        </button>
      </div>

      {(!account) && <p>Connect wallet to view your complaints.</p>}

      {account && (loading ? (
        <p>Loading...</p>
      ) : complaints.length === 0 ? (
        <p>No complaints yet.</p>
      ) : (
        complaints.map((c) => (
          <div key={c.id} className="card">
            <p><strong>ID:</strong> {c.id}</p>
            <p><strong>Title:</strong> {c.title}</p>
            <p><strong>Status:</strong> {STATUS[c.status] ?? c.status}</p>
            <p><strong>Priority:</strong> {PRIORITY[c.priority] ?? c.priority}</p>
            <p><strong>Department:</strong> {c.departmentId}</p>
          </div>
        ))
      ))}
    </div>
  );
}

export default App;
