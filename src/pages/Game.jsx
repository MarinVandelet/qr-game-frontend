import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

const QUESTION_PHASES = {
  THINK: "THINK",
  ANSWER: "ANSWER",
  RESULT: "RESULT",
  END: "END",
};



export default function Game() {
  const { code } = useParams();

  const [phase, setPhase] = useState(QUESTION_PHASES.THINK);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [question, setQuestion] = useState(null);

  const [activePlayerId, setActivePlayerId] = useState(null);
  const [activePlayerName, setActivePlayerName] = useState("");

  const [chosenIndex, setChosenIndex] = useState(null);
  const [correctIndex, setCorrectIndex] = useState(null);

  const [quizEnded, setQuizEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [success, setSuccess] = useState(false);

  // TIMER
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(1);

  // Force refresh for animated timer bar
  const [force, setForce] = useState(0);

  const playerId = Number(localStorage.getItem("playerId"));

  // Auto refresh UI for timer bar
  useEffect(() => {
    const i = setInterval(() => setForce(x => x + 1), 100);
    return () => clearInterval(i);
  }, []);

  // Join room
  useEffect(() => {
    socket.emit("joinRoom", code);
  }, [code]);

  // Socket event listeners
  useEffect(() => {
    socket.on("questionData", (q) => {
      setQuestion(q);
      setChosenIndex(null);
      setCorrectIndex(null);
    });

    socket.on("phase", (data) => {
      setPhase(data.type);
      setQuestionIndex(data.questionIndex);
      setActivePlayerId(data.activePlayerId || null);
      setActivePlayerName(data.activePlayerName || "");

      setDuration(data.duration);
      setStartTime(data.startTime);
    });

    socket.on("answerResult", (data) => {
      setCorrectIndex(data.correctIndex);
      setChosenIndex(data.chosenIndex);
    });

    socket.on("quizEnd", (data) => {
      setQuizEnded(true);
      setScore(data.score);
      setSuccess(data.success);
      setPhase(QUESTION_PHASES.END);
    });

    return () => {
      socket.off("questionData");
      socket.off("phase");
      socket.off("answerResult");
      socket.off("quizEnd");
    };
  }, []);

  // TIMER PROGRESS
  const computeProgress = () => {
    if (!startTime) return 1;
    const elapsed = Date.now() - startTime;
    let progress = 1 - elapsed / duration;
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    return progress;
  };

  const progress = computeProgress();

  const sendAnswer = (index) => {
    if (playerId !== activePlayerId) return;
    setChosenIndex(index);
    socket.emit("answer", {
      roomCode: code,
      playerId,
      chosenIndex: index,
    });
  };

  // Ecran de Fin
  if (quizEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-800 flex items-center justify-center p-6 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/20 p-10 rounded-3xl backdrop-blur-md shadow-xl text-center max-w-lg w-full"
        >
          <h1 className="text-3xl font-bold mb-4">Fin du Quiz</h1>

          <p className="text-xl opacity-90 mb-2">
            Score de l&apos;équipe : <b>{score}/6</b>
          </p>

          {success ? (
            <>
              <p className="text-green-300 text-xl font-bold mb-6">
                🎉 Bravo ! Vous débloquez le Jeu 2 !
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white text-blue-800 px-6 py-3 rounded-xl shadow-lg font-bold w-full"
              >
                Passer au Jeu 2
              </motion.button>
            </>
          ) : (
            <>
              <p className="text-red-300 text-xl font-bold mb-6">
                ❌ Score insuffisant… Recommencez !
              </p>

              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white text-blue-800 px-6 py-3 rounded-xl shadow-lg font-bold w-full"
              >
                Rejouer
              </motion.button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (phase === "LOADING") {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-purple-700 flex items-center justify-center p-4 text-white">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-xl opacity-90"
      >
        Préparation de la question…
      </motion.div>
    </div>
  );
}


  // Ecran Principal du Jeu
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-purple-700 flex items-center justify-center p-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 text-sm opacity-90">
          <span>Salon : {code}</span>
          <span>Question {questionIndex + 1} / 6</span>
        </div>

        {/* TIMER BAR */}
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full ${
              phase === QUESTION_PHASES.THINK
                ? "bg-yellow-300"
                : phase === QUESTION_PHASES.ANSWER
                ? "bg-green-400"
                : "bg-red-400"
            }`}
            style={{
              width: `${progress * 100}%`,
              transition: "width 0.1s linear"
            }}
          />
        </div>

        {/* QUESTION */}
        {question && (
          <>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-3 text-center">
              {question.questionText}
            </h1>

            {question.imageUrl && (
              <div className="bg-white rounded-2xl p-4 flex items-center justify-center shadow-inner mb-6">
                <img
                  src={question.imageUrl}
                  alt=""
                  className="max-h-40 object-contain"
                />
              </div>
            )}
          </>
        )}

        {/* PHASE TEXT */}
        {phase === QUESTION_PHASES.THINK && (
          <p className="text-center text-lg opacity-80">
            Réfléchis… les réponses arrivent bientôt.
          </p>
        )}

        {phase === QUESTION_PHASES.ANSWER && (
          <p className="text-center text-lg opacity-80 mb-4">
            C’est au tour de <b>{activePlayerName}</b>
          </p>
        )}

        {phase === QUESTION_PHASES.RESULT && (
          <p className="text-center text-lg opacity-80 mb-4">
            Résultat…
          </p>
        )}

        {/* ANSWERS */}
        {question && (
          <div className="mt-6 space-y-4">

            {/* PHASE ANSWER */}
            {phase === QUESTION_PHASES.ANSWER &&
              question.answers.map((ans, i) => {
                const isSelected = chosenIndex === i;

                return (
                  <motion.button
                    key={i}
                    whileTap={playerId === activePlayerId ? { scale: 0.95 } : {}}
                    onClick={() => sendAnswer(i)}
                    disabled={playerId !== activePlayerId}
                    className={`w-full py-3 rounded-xl text-left px-4 font-semibold shadow ${
                      isSelected
                        ? "bg-blue-400 text-blue-900"
                        : "bg-white/80 text-blue-900"
                    } disabled:opacity-50`}
                  >
                    {String.fromCharCode(65 + i)}) {ans}
                  </motion.button>
                );
              })}

            {/* PHASE RESULT */}
            {phase === QUESTION_PHASES.RESULT &&
              question.answers.map((ans, i) => {
                const good = i === correctIndex;
                const bad = chosenIndex === i && !good;

                return (
                  <div
                    key={i}
                    className={`w-full py-3 rounded-xl px-4 font-semibold shadow text-left ${
                      good
                        ? "bg-green-400 text-green-900"
                        : bad
                        ? "bg-red-400 text-red-900"
                        : "bg-white/80 text-blue-900"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}) {ans}
                  </div>
                );
              })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
