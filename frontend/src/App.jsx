import { useState, useEffect } from "react";

export default function App() {
  const [cards, setCards] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [flipped, setFlipped] = useState({});
  const [hidden, setHidden] = useState({});
  const [editing, setEditing] = useState(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/cards")
      .then(res => res.json())
      .then(data => setCards(data))
  }, []);

  async function addCard(e) {
    e.preventDefault();
    if (question == "" || answer == "") return;
    let res = await fetch("http://localhost:8000/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: editQuestion, answer: editAnswer }),
    });
    let updated = await res.json();
    setCards(cards.map((c) => (c.id === id ? updated : c)));
    setEditing(null);
  }

  function deleteCard(id) {
    fetch("http://localhost:8000/api/cards/" + id, { method: "DELETE" });
    setCards(cards.filter((c) => c.id !== id));
  }

  return (
    <div className="container">
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
        {cards.map((card) => (
          <div
            key={card.id}
            className="card"
            style={hidden[card.id] ? {visibility: "hidden"} : {}}
            onClick={() => {
              if (flipped[card.id]) {
                setHidden({...hidden, [card.id]: true});
              } else {
                setFlipped({...flipped, [card.id]: true});
              }
            }}
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
