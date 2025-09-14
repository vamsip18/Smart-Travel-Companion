import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";

const BASE_URL = "https://smart-travel-companion-udlt.onrender.com";

const Hospitals = ({ location, userid }) => {
  const [hospitals, setHospitals] = useState([]);
  const [savedHospitals, setSavedHospitals] = useState(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch nearby hospitals
  useEffect(() => {
    if (!location) {
      setError("Please provide a valid location.");
      return;
    }

    const debounceFetch = setTimeout(() => {
      setLoading(true);
      setError("");

      axios
        .get(`${BASE_URL}/fetch-hospitals`, { params: { location } })
        .then((response) => {
          setHospitals(response.data.results || []);
        })
        .catch((error) => {
          console.error("Error fetching hospitals:", error);
          setError("Failed to load hospitals. Please try again later.");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 500);

    return () => clearTimeout(debounceFetch);
  }, [location]);

  // Fetch saved hospitals
  useEffect(() => {
    const fetchSavedHospitals = async () => {
      if (!userid?.userid) return;
      try {
        const response = await axios.get(
          `${BASE_URL}/saved-hospitals/${userid.userid}`
        );
        const savedIds = new Set(response.data.map((h) => String(h.hospital_id)));
        setSavedHospitals(savedIds);
      } catch (error) {
        console.error("Error fetching saved hospitals:", error);
      }
    };
    fetchSavedHospitals();
  }, [userid?.userid]);

  const navigateToGoogleMaps = (lat, lng) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  const shareHospital = (hospital) => {
    const shareText = `🏥 Check out "${hospital.name}" in ${location}
🏠 Address: ${hospital.location?.formatted_address}
🗺 Google Maps: https://www.google.com/maps/search/?api=1&query=${hospital.geocodes.main.latitude},${hospital.geocodes.main.longitude}`;

    if (navigator.share) {
      navigator
        .share({ title: hospital.name, text: shareText })
        .catch((e) => console.error("Error sharing:", e));
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Details copied to clipboard!");
    }
  };

  const toggleSaveHospital = async (hospital) => {
    if (!userid?.userid) {
      alert("Please log in to save hospitals.");
      navigate("/signin");
      return;
    }

    const hospitalIdStr = String(hospital.id);

    try {
      if (savedHospitals.has(hospitalIdStr)) {
        // Unsave hospital
        await axios.post(`${BASE_URL}/delete-hospital`, {
          userId: userid.userid,
          hospitalId: hospital.id,
        });
        setSavedHospitals((prev) => {
          const updatedSet = new Set(prev);
          updatedSet.delete(hospitalIdStr);
          return updatedSet;
        });
      } else {
        // Save hospital
        await axios.post(`${BASE_URL}/save-hospital`, {
          userId: userid.userid,
          hospitalId: hospital.id,
          name: hospital.name,
          address: hospital.location?.formatted_address,
          photo: hospital.photo,
          latitude: hospital.geocodes.main.latitude,
          longitude: hospital.geocodes.main.longitude,
        });
        setSavedHospitals((prev) => new Set([...prev, hospitalIdStr]));
      }
    } catch (error) {
      console.error("Error toggling hospital save state:", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>Hospitals in {location}</h1>
      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "center",
        }}
      >
        {hospitals.map((hospital) => {
          const hospitalIdStr = String(hospital.id);
          const isSaved = savedHospitals.has(hospitalIdStr);

          return (
            <div
              key={hospital.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "10px",
                padding: "10px",
                width: "280px",
                textAlign: "center",
                cursor: "pointer",
              }}
              onClick={() =>
                navigateToGoogleMaps(
                  hospital.geocodes.main.latitude,
                  hospital.geocodes.main.longitude
                )
              }
            >
              <img
                src={
                  hospital.photo ||
                  "https://via.placeholder.com/250x150.png?text=No+Image"
                }
                alt={hospital.name}
                style={{ width: "100%", borderRadius: "10px", height: "150px" }}
              />
              <h3>{hospital.name}</h3>
              <p>
                {hospital.location?.formatted_address || "No address available"}
              </p>
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                <button
                  style={{
                    padding: "6px 12px",
                    background: "navy",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToGoogleMaps(
                      hospital.geocodes.main.latitude,
                      hospital.geocodes.main.longitude
                    );
                  }}
                >
                  Directions
                </button>
                <button
                  style={{
                    padding: "6px 12px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    shareHospital(hospital);
                  }}
                >
                  <ShareIcon />
                </button>
                <button
                  style={{
                    padding: "6px 12px",
                    background: isSaved ? "gray" : "red",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSaveHospital(hospital);
                  }}
                >
                  <FavoriteIcon style={{ color: isSaved ? "red" : "white" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Hospitals;
