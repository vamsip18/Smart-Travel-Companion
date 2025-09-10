import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";

const BASE_URL = "http://localhost:8000";

const Temples = ({ location, userid }) => {
  const [sites, setSites] = useState([]);
  const [savedSites, setSavedSites] = useState(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!location) return;

    setLoading(true);
    axios
      .get(`${BASE_URL}/religious-sites`, { params: { location } })
      .then((res) => setSites(res.data.results || []))
      .catch((err) => {
        console.error(err);
        setError("Failed to load religious sites.");
      })
      .finally(() => setLoading(false));
  }, [location]);

  // Fetch saved sites
  useEffect(() => {
    const fetchSavedSites = async () => {
      if (!userid?.userid) return;
      try {
        const response = await axios.get(
          `${BASE_URL}/saved-sites/${userid.userid}`
        );
        const savedIds = new Set(response.data.map((s) => String(s.site_id)));
        setSavedSites(savedIds);
      } catch (error) {
        console.error("Error fetching saved sites:", error);
      }
    };
    fetchSavedSites();
  }, [userid?.userid]);

  const navigateToGoogleMaps = (lat, lng) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  const shareSite = (site) => {
    const shareText = `🙏 Check out "${site.name}" in ${location}
🏠 Address: ${site.location?.formatted_address}
🗺 Google Maps: https://www.google.com/maps/search/?api=1&query=${site.geocodes.main.latitude},${site.geocodes.main.longitude}`;

    if (navigator.share) {
      navigator
        .share({ title: site.name, text: shareText })
        .catch((e) => console.error("Error sharing:", e));
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Details copied to clipboard!");
    }
  };

  const toggleSaveSite = async (site) => {
    if (!userid?.userid) {
      alert("Please log in to save sites.");
      navigate("/signin");
      return;
    }

    const siteIdStr = String(site.id);

    try {
      if (savedSites.has(siteIdStr)) {
        // Unsave site
        await axios.post(`${BASE_URL}/delete-site`, {
          userId: userid.userid,
          siteId: site.id,
        });
        setSavedSites((prev) => {
          const updatedSet = new Set(prev);
          updatedSet.delete(siteIdStr);
          return updatedSet;
        });
      } else {
        // Save site
        await axios.post(`${BASE_URL}/save-site`, {
          userId: userid.userid,
          siteId: site.id,
          name: site.name,
          address: site.location?.formatted_address,
          photo: site.photo,
          latitude: site.geocodes.main.latitude,
          longitude: site.geocodes.main.longitude,
        });
        setSavedSites((prev) => new Set([...prev, siteIdStr]));
      }
    } catch (error) {
      console.error("Error toggling site save state:", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>Religious Sites in {location}</h1>
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
        {sites.map((site) => {
          const siteIdStr = String(site.id);
          const isSaved = savedSites.has(siteIdStr);

          return (
            <div
              key={site.id}
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
                  site.photo ||
                  "https://via.placeholder.com/250x150.png?text=No+Image"
                }
                alt={site.name}
                style={{ width: "100%", borderRadius: "10px", height: "150px" }}
              />
              <h3>{site.name}</h3>
              <p>{site.location?.formatted_address || "No address available"}</p>

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
                      site.geocodes.main.latitude,
                      site.geocodes.main.longitude
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
                  onClick={() => shareSite(site)}
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
                  onClick={() => toggleSaveSite(site)}
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

export default Temples;
