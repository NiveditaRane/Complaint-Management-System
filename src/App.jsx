import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";
import abi from "./abi.json";

// replace with your deployed contract address
const contractAddress = "0x71c92eb1E2Be2Eeb58363184624ca86326F92081";

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [title, setTitle] = useState("");
  const [detailsHash, setDetailsHash] = useState("");
  const [deptId, setDeptId] = useState(1);
  const [priority, setPriority] = useState(0);
  const [complaints, setComplaints] = useState([]);

  const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    // Ask MetaMask to connect
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const addr = accounts[0];

    setAccount(addr);

    const c = new ethers.Contract(contractAddress, abi, signer);
    setContract(c);

    console.log("✅ Connected:", addr);
  } catch (error) {
    console.error("❌ Wallet connection failed:", error);
  }
};


  // file a complaint
  const fileComplaint = async () => {
    if (!contract) return alert("Connect your wallet first!");
    try {
      const tx = await contract.fileComplaint(
        deptId,
        priority,
        title,
        detailsHash,
        []
      );
      await tx.wait();
      alert("Complaint filed successfully!");
      setTitle("");
      setDetailsHash("");
      fetchMyComplaints();
    } catch (err) {
      console.error(err);
      alert("Failed to file complaint");
    }
  };

  // fetch complaints of connected account
  const fetchMyComplaints = async (c = contract, addr = account) => {
    if (!c || !addr) return;
    try {
      const ids = await c.complaintsOf(addr);
      const list = [];
      for (let id of ids) {
        const comp = await c.getComplaint(id);
        list.push(comp);
      }
      setComplaints(list);
    } catch (err) {
      console.error(err);
    }
  };

  // update complaints when account/contract changes
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
      <select
        value={priority}
        onChange={(e) => setPriority(Number(e.target.value))}
      >
        <option value={0}>Low</option>
        <option value={1}>Medium</option>
        <option value={2}>High</option>
        <option value={3}>Urgent</option>
      </select>
      <button onClick={fileComplaint}>Submit Complaint</button>

      <h2>My Complaints</h2>
      {complaints.length === 0 ? (
        <p>No complaints yet.</p>
      ) : (
        complaints.map((c, i) => (
          <div key={i} className="card">
            <p><strong>ID:</strong> {String(c[0])}</p>
            <p><strong>Title:</strong> {c[5]}</p>
            <p><strong>Status:</strong> {Object.keys(c[4])[0]}</p>
            <p><strong>Department:</strong> {String(c[2])}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
