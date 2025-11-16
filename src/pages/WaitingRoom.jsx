import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { FiCopy } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";

const socket = io("https://qr-game-backend.onrender.com");

export default function WaitingRoom() {
  const { code } = useParams();

  const [players, setPlayers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);

  const playerId = Number(localStorage.getItem("playerId"));
  const navigate = useNavigate();

  // 🔥 IMPORTANT : rejoindre le salon via WebSocket
  useEffect(() => {
    if (!code) return;

    socket.emit("joinRoom", code);
  }, [code]);

  // Charger les joueurs
  const fetchPlayers = async () => {
    try {
      const res = await axios.get(
        `https://qr-game-backend.onrender.com/api/room/players/${code}`
      );

      setPlayers(res.data.players || []);
      setOwnerId(res.data.ownerId);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();

    const interval = setInterval(fetchPlayers, 1500);
    return () => clearInterval(interval);
  }, []);

  const isOwner = ownerId === playerId;

  const handleStart = () => {
    socket.emit("startGame", code);
    navigate(`/game/${code}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-300 to-blue-950 flex items-center justify-center p-4 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <p className="uppercase tracking-[0.2em] text-sm opacity-80">Salon</p>
        <h1 className="text-3xl font-extrabold mb-4">Salle d'attente</h1>

        {/* CODE + COPY */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
          <span className="text-sm opacity-80">Code</span>
          <p className="font-mono text-lg bg-white text-blue-900 px-3 py-1 rounded-full">
            {code}
          </p>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigator.clipboard.writeText(code)}
            className="bg-white text-blue-900 p-2 rounded-lg shadow hover:bg-blue-100"
            title="Copier"
          >
            <FiCopy size={20} />
          </motion.button>
        </div>

        <h2 className="text-xl font-semibold mb-3">Joueurs connectés</h2>

        <div className="space-y-2">
          {players.length === 0 && (
            <p className="opacity-70 text-sm">En attente des joueurs…</p>
          )}

          {players.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/90 text-blue-900 py-2 px-4 rounded-xl shadow flex justify-between items-center"
            >
              <span className="font-medium">
                {p.firstName} {p.lastName}
              </span>

              {p.id === ownerId && (
                <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">
                  Chef
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* BOUTON LANCER */}
        <div className="mt-8">
          {isOwner ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleStart}
              className="w-full bg-green-400 hover:bg-green-500 text-green-900 py-3 rounded-xl font-semibold shadow-lg"
            >
              Lancer la partie
            </motion.button>
          ) : (
            <p className="text-sm opacity-70">
              En attente que le chef lance la partie…
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
