import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/mandatedetails.css";

const MandateDetails = () => {
  const { mandateId } = useParams();
  const [resumes, setResumes] = useState([]);
  const [mandateDetails, setMandateDetails] = useState({});

  useEffect(() => {
    console.log("Frontend mandateId:", mandateId);

    if (!mandateId) return;

    const fetchDetails = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5001/api/jobMandates/admin/completed-mandates/${mandateId}/details`
        );
        console.log("API response:", res.data);
        setResumes(res.data.resumes || []);
        setMandateDetails(res.data.mandateDetails || {});
      } catch (err) {
        console.error("Error fetching mandate details:", err);
      }
    };
    fetchDetails();
  }, [mandateId]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Completed Mandate Details</h2>

      <div className="mb-6 border p-3 rounded bg-gray-50">
        <p>
          <strong>Started At:</strong>{" "}
          {mandateDetails.started_at
            ? new Date(mandateDetails.started_at).toLocaleString()
            : "-"}
        </p>
        <p>
          <strong>Submitted At:</strong>{" "}
          {mandateDetails.submitted_at
            ? new Date(mandateDetails.submitted_at).toLocaleString()
            : "-"}
        </p>
      </div>

      <h3 className="text-lg font-semibold mb-2">Submitted Resumes</h3>
      <table className="table-auto border-collapse border border-gray-400 w-full">
        <thead>
          <tr>
            <th className="border px-2 py-1">Candidate</th>
            <th className="border px-2 py-1">Status</th>
            <th className="border px-2 py-1">Submitted At</th>
          </tr>
        </thead>
        <tbody>
          {resumes.map((resume) => (
            <tr key={resume.id}>
              <td className="border px-2 py-1">{resume.candidate_name}</td>
              <td className="border px-2 py-1">{resume.status}</td>
              <td className="border px-2 py-1">
                {resume.submitted_at
                  ? new Date(resume.submitted_at).toLocaleString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MandateDetails;
