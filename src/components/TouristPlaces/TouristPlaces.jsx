import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";

const BASE_URL = "http://localhost:8000";

const TouristPlaces = ({ location, userid }) => {
  const [places, setPlaces] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch nearby places
  useEffect(() => {
    if (!location) return;

    setLoading(true);
    axios
      .get(`${BASE_URL}/fetch-places`, { params: { location } })
      .then((res) => setPlaces(res.data.results || []))
      .catch((err) => {
        console.error(err);
        setError("Failed to load tourist places.");
      })
      .finally(() => setLoading(false));
  }, [location]);

  // Fetch saved tourist places
  useEffect(() => {
    const fetchSavedPlaces = async () => {
      if (!userid?.userid) return;
      try {
        // console.log(userid.userid);
        const response = await axios.get(
          `${BASE_URL}/saved-places/${userid.userid}`
        );
        const savedIds = new Set(response.data.map((p) => String(p.place_id)));
        setSavedPlaces(savedIds);
      } catch (error) {
        console.error("Error fetching saved places:", error);
      }
    };
    fetchSavedPlaces();
  }, [userid?.userid]);

  const navigateToGoogleMaps = (lat, lng) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  const sharePlace = (place) => {
    const shareText = `🌍 Check out "${place.name}" in ${location}
🏠 Address: ${place.location?.formatted_address}
🗺 Google Maps: https://www.google.com/maps/search/?api=1&query=${place.geocodes.main.latitude},${place.geocodes.main.longitude}`;

    if (navigator.share) {
      navigator.share({ title: place.name, text: shareText }).catch((e) =>
        console.error("Error sharing:", e)
      );
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Details copied to clipboard!");
    }
  };

  const toggleSavePlace = async (place) => {
    if (!userid?.userid) {
      alert("Please log in to save places.");
      navigate("/signin");
      return;
    }

    const placeIdStr = String(place.id);

    try {
      if (savedPlaces.has(placeIdStr)) {
        // Unsave place
        await axios.post(`${BASE_URL}/delete-place`, {
          userId: userid.userid,
          placeId: place.id,
        });
        setSavedPlaces((prev) => {
          const updatedSet = new Set(prev);
          updatedSet.delete(placeIdStr);
          return updatedSet;
        });
      } else {
        // Save place
        await axios.post(`${BASE_URL}/save-place`, {
          userId: userid.userid,
          placeId: place.id,
          name: place.name,
          address: place.location?.formatted_address,
          image: place.photo,
          latitude: place.geocodes.main.latitude,
          longitude: place.geocodes.main.longitude,
        });
        setSavedPlaces((prev) => new Set([...prev, placeIdStr]));
      }
    } catch (error) {
      console.error("Error toggling place save state:", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>Tourist Attractions in {location}</h1>
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
        {places.map((place) => {
          const placeIdStr = String(place.id);
          const isSaved = savedPlaces.has(placeIdStr);

          return (
            <div
              key={place.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "10px",
                padding: "10px",
                width: "280px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <img
                src={
                  place.photo ||
                  "https://via.placeholder.com/250x150.png?text=No+Image"
                }
                alt={place.name}
                style={{ width: "100%", borderRadius: "10px", height: "150px" }}
              />
              <h3>{place.name}</h3>
              <p>{place.location?.formatted_address || "No address available"}</p>

              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  paddingTop: "10px",
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
                  onClick={() =>
                    navigateToGoogleMaps(
                      place.geocodes.main.latitude,
                      place.geocodes.main.longitude
                    )
                  }
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
                  onClick={() => sharePlace(place)}
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
                  onClick={() => toggleSavePlace(place)}
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

export default TouristPlaces;
