import React from "react";
import PairGame from "../components/PairGame";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const GamePage = () => {
  const navigate = useNavigate();

  const handleSubmit = async (answers) => {
    await addDoc(collection(db, "submissions"), {
      answers,
      submittedAt: serverTimestamp(),
    });
    navigate("/result");
  };

  return <PairGame onSubmit={handleSubmit} />;
};

export default GamePage;
