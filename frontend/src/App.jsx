import { useState, useEffect } from "react";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState("");

  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [flipped, setFlipped] = useState({});
  const [hidden, setHidden] = useState({});
  const [editing, setEditing] = useState(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  const [view, setView] = useState("cards");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:8000/api/cards", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCards(data));
  }, [token]);

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError("");
    const url = isRegister ? "/api/auth/register" : "/api/auth/login";
    let res, data;
    try {
      res = await fetch("http://localhost:8000" + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUsername, password: authPassword }),
      });
      data = await res.json();
    } catch {
      setAuthError("Could not reach server");
      return;
    }
    if (!res.ok) {
      setAuthError(data.detail);
      return;
    }
    if (isRegister) {
      setIsRegister(false);
      setAuthError("Registered! Please log in.");
      return;
    }
    console.log("login response:", data);
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("username", authUsername);
    localStorage.setItem("role", data.role);
    setToken(data.access_token);
    setUsername(authUsername);
    setRole(data.role);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setToken("");
    setUsername("");
    setRole("");
    setCards([]);
    setView("cards");
    setFlipped({});
    setHidden({});
    setSearch("");
  }

  async function openAdmin() {
    const res = await fetch("http://localhost:8000/api/admin/history", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    setHistory(data);
    setView("admin");
  }

  async function addCard(e) {
    e.preventDefault();
    if (question == "" || answer == "") return;
    let res = await fetch("http://localhost:8000/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ question, answer }),
    });
    let newCard = await res.json();
    setCards([...cards, newCard]);
    setQuestion("");
    setAnswer("");
  }

  function startEdit(card) {
    setEditing(card.id);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  }

  async function saveEdit(id) {
    let res = await fetch("http://localhost:8000/api/cards/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ question: editQuestion, answer: editAnswer }),
    });
    let updated = await res.json();
    setCards(cards.map((c) => (c.id === id ? updated : c)));
    setEditing(null);
  }

  function deleteCard(id) {
    fetch("http://localhost:8000/api/cards/" + id, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
    setCards(cards.filter((c) => c.id !== id));
  }

  function flipCard(card) {
    if (flipped[card.id]) {
      setHidden({...hidden, [card.id]: true});
    } else {
      setFlipped({...flipped, [card.id]: true});
      fetch("http://localhost:8000/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ card_id: card.id }),
      });
    }
  }

  if (!token) {
    return (
      <div className="container">
        <form className="auth-form" onSubmit={handleAuth}>
          <h2>{isRegister ? "Register" : "Login"}</h2>
          {authError && <span className="error">{authError}</span>}
          <span className="form-label">Username</span>
          <input
            type="text"
            value={authUsername}
            onChange={(e) => setAuthUsername(e.target.value)}
          />
          <span className="form-label">Password</span>
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
          />
          <button type="submit">{isRegister ? "Register" : "Login"}</button>
          <button type="button" className="link-btn" onClick={() => { setIsRegister(!isRegister); setAuthError(""); }}>
            {isRegister ? "Login" : "Register"}
          </button>
        </form>
      </div>
    );
  }

  if (view === "admin") {
    return (
      <div className="container">
        <div className="topbar">
          <span>Logged in as <strong>{username}</strong></span>
          <div>
            <button onClick={() => setView("cards")}>My Cards</button>
            <button onClick={logout}>Logout</button>
          </div>
        </div>
        <h2 className="admin-title">Learning History</h2>
        <table className="history-table">
          <tr>
            <th>User</th>
            <th>Card</th>
            <th>Time</th>
          </tr>
          {history.map((entry) => (
            <tr key={entry._id}>
              <td>{entry.username}</td>
              <td>{entry.question}</td>
              <td>{new Date(entry.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </table>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="topbar">
        <span>Logged in as <strong>{username}</strong></span>
        <div>
          {role === "admin" && <button onClick={openAdmin}>Admin</button>}
          <button onClick={logout}>Logout</button>
        </div>
      </div>
      <input
        className="search"
        type="text"
        placeholder="Search cards"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <form className="form" onSubmit={addCard}>
        <span className="form-label">Question</span>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <span className="form-label">Answer</span>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <div className="card-list">
        {cards.filter(c => c.question.toLowerCase().includes(search.toLowerCase()) || c.answer.toLowerCase().includes(search.toLowerCase())).map((card) => (
          <div
            key={card.id}
            className="card"
            style={hidden[card.id] ? {visibility: "hidden"} : {}}
            onClick={() => flipCard(card)}
          >
            {editing === card.id ? (
              <div className="edit-form" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                />
                <input
                  type="text"
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                />
                <button onClick={() => saveEdit(card.id)}>Save</button>
                <button onClick={() => setEditing(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="question">{card.question}</div>
                {flipped[card.id] && <div className="answer">{card.answer}</div>}
                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(card);
                  }}
                >
                  ✎
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCard(card.id);
                  }}
                >
                  x
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
