import React, { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { v4 as uuidv4 } from "uuid"; // ✅ UUID import
import Login from "./Pages/Login";
import AdminDashboard from "./Pages/AdminDashboard";
import RegisterCandidate from "./Pages/RegisterCandidate";
import CandidateList from "./Pages/CandidateList";
import CandidateDetail from "./Pages/CandidateDetail";
import SuperAdminDashboard from "./Pages/SuperAdminDashboard";
import Createadminform from "./Pages/Createadminform";
import Viewadmin from "./Pages/Viewadmin";
import AdminDetails from "./Pages/AdminDetails";
import ReviewResumes from "./Pages/ReviewResumes";
import PostMandate from "./Pages/PostMandate";
import MandateWork from "./Pages/MandateWork";
import Mandatedetails from "./Pages/mandatedetails";

function App() {
  const [candidates, setCandidates] = useState([]);

  // 🔁 Load candidates from localStorage on page load
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("candidates") || "[]");
    setCandidates(stored);
  }, []);

  // ✅ Add new candidate with UUID + save to localStorage
  const addCandidate = (candidate) => {
    const id = uuidv4();
    const newCandidate = { id, ...candidate };
    const updated = [...candidates, newCandidate];
    setCandidates(updated);
    localStorage.setItem("candidates", JSON.stringify(updated));
  };

  const router = createBrowserRouter([
    { path: "/", element: <Login /> },
    { path: "/AdminDashboard", element: <AdminDashboard /> },
    {
      path: "/RegisterCandidate",
      element: <RegisterCandidate addCandidate={addCandidate} />,
    },
    {
      path: "/CandidateList",
      element: <CandidateList candidates={candidates} />,
    },
    {
      path: "/CandidateDetail/:id",
      element: <CandidateDetail candidates={candidates} />,
    },
    {
      path: "/SuperAdminDashboard",
      element: <SuperAdminDashboard />,
    },
    {
      path: "/Createadminform",
      element: <Createadminform />,
    },
    {
      path: "/Viewadmin",
      element: <Viewadmin />,
    },
    {
      path: "/AdminDetails/:id",
      element: <AdminDetails />,
    },
    {
      path: "/ReviewResumes",
      element: <ReviewResumes />,
    },
    {
      path: "/PostMandate",
      element: <PostMandate />,
    },
    {
      path: "/MandateWork",
      element: <MandateWork />,
    },
    {
      path: "/admin/completed-mandates/:mandateId/details",
      element: <Mandatedetails />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
