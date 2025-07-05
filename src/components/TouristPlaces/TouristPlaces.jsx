import React, { useEffect, useState } from "react";
import axios from "axios";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";
import { useNavigate } from "react-router-dom";

// Fallback local images (should exist in public/assets/images/TouristPlaces/)
const fallbackImages = Array.from({ length: 10 }, (_, i) =>
  `/assets/images/TouristPlaces/tourist${i + 1}.jpg`
);

const FOURSQUARE_API_KEY = "fsq3bR2ZSdYTD6aJx4cIN64OgWLS1N9ZZQxilWdPfpL+36E=";

const TouristPlaces = ({ location, userid }) => {
  const userId = userid?.userid;
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedPlaces, setSavedPlaces] = useState(new Set());
  const navigate = useNavigate();

  const navigateToGoogleMaps = (lat, lng) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  useEffect(() => {
    if (!userId) return;

    const fetchSavedPlaces = async () => {
      try {
        const response = await axios.get(`/api/saved-places/${userId}`);
        const savedIds = response.data.map((place) => place.place_id);
        setSavedPlaces(new Set(savedIds));
      } catch (error) {
        console.error("Error fetching saved places:", error);
      }
    };

    fetchSavedPlaces();
  }, [userId]);

  useEffect(() => {
    if (!location) return;

    const fetchTouristPlaces = async () => {
      try {
        const geoResponse = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: { q: location, format: "json", limit: 1 },
          }
        );

        if (geoResponse.data.length === 0) {
          setError("Location not found.");
          setLoading(false);
          return;
        }

        const { lat, lon } = geoResponse.data[0];

        const placesResponse = await axios.get(
          "https://api.foursquare.com/v3/places/search",
          {
            headers: { Authorization: FOURSQUARE_API_KEY },
            params: {
              ll: `${lat},${lon}`,
              categories: "16000", // Category for tourist/historical places
              sort: "POPULARITY",
              limit: 16,
            },
          }
        );

        const results = placesResponse.data.results;
        if (!results || results.length === 0) {
          setError("No tourist places found.");
          setLoading(false);
          return;
        }

        const usedFallbackIndexes = new Set();

        const enrichedPlaces = await Promise.all(
          results.map(async (place, index) => {
            try {
              const photoRes = await axios.get(
                `https://api.foursquare.com/v3/places/${place.fsq_id}/photos`,
                {
                  headers: { Authorization: FOURSQUARE_API_KEY },
                }
              );

              if (photoRes.data.length > 0) {
                const photo = photoRes.data[0];
                place.image = `${photo.prefix}300x300${photo.suffix}`;
              } else {
                let fallbackIndex = index % fallbackImages.length;
                while (usedFallbackIndexes.has(fallbackIndex)) {
                  fallbackIndex = (fallbackIndex + 1) % fallbackImages.length;
                }
                usedFallbackIndexes.add(fallbackIndex);
                place.image = fallbackImages[fallbackIndex];
              }
            } catch {
              let fallbackIndex = index % fallbackImages.length;
              while (usedFallbackIndexes.has(fallbackIndex)) {
                fallbackIndex = (fallbackIndex + 1) % fallbackImages.length;
              }
              usedFallbackIndexes.add(fallbackIndex);
              place.image = fallbackImages[fallbackIndex];
            }
            return place;
          })
        );

        setPlaces(enrichedPlaces);
        setError("");
      } catch (err) {
        console.error("Error fetching places:", err);
        setError("Failed to load tourist places.");
      } finally {
        setLoading(false);
      }
    };

    fetchTouristPlaces();
  }, [location]);

  const toggleSavePlace = async (place) => {
    if (!userId) {
      alert("Please log in to save places.");
      navigate("/signin");
      return;
    }

    const placeId = String(place.fsq_id);

    try {
      if (savedPlaces.has(placeId)) {
        await axios.post("/api/delete-place", {
          userId,
          placeId,
        });
        setSavedPlaces((prev) => {
          const updated = new Set(prev);
          updated.delete(placeId);
          return updated;
        });
      } else {
        await axios.post("/api/save-place", {
          userId,
          placeId,
          name: place.name || "Unknown",
          address: place.location?.formatted_address || "Address not available",
          latitude: place.geocodes?.main?.latitude || 0,
          longitude: place.geocodes?.main?.longitude || 0,
          image: place.image || "",
        });
        setSavedPlaces((prev) => new Set([...prev, placeId]));
      }
    } catch (error) {
      console.error("Error saving/deleting place:", error);
    }
  };

  const sharePlace = async (place) => {
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${place.geocodes?.main?.latitude},${place.geocodes?.main?.longitude}`;
    const text = `🏛 Explore: ${place.name}\n📍 ${place.location?.formatted_address}\n🗺 ${mapsLink}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: place.name, text });
      } catch (err) {
        console.error("Sharing error:", err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("Sharing not supported. Copied to clipboard!");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>Top Historical Places in {location}</h1>

      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "20px",
        }}
      >
        {places.map((place) => {
          const placeId = String(place.fsq_id);
          const isSaved = savedPlaces.has(placeId);

          return (
            <div
              key={place.fsq_id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "10px",
                padding: "10px",
                width: "280px",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                textAlign: "center",
              }}
              onClick={() =>
                navigateToGoogleMaps(
                  place.geocodes.main.latitude,
                  place.geocodes.main.longitude
                )
              }
            >
              <img
                src={place.image}
                alt={place.name}
                style={{
                  width: "100%",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "10px",
                }}
                onError={(e) => {
                  e.target.src = "/assets/images/hospitals/default.jpg";
                }}
              />
              <h3 style={{ margin: "10px 0" }}>{place.name}</h3>
              <p>{place.location?.formatted_address || "Address not available"}</p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "auto",
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
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToGoogleMaps(
                      place.geocodes.main.latitude,
                      place.geocodes.main.longitude
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
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    sharePlace(place);
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
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSavePlace(place);
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

export default TouristPlaces;
