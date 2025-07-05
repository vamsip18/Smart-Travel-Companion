import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";

// Use relative path for Vercel proxy support
const BASE_URL = "/api";

const TopRestaurants = ({ location, userid }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [savedRestaurants, setSavedRestaurants] = useState(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const budget = 2;
  const navigate = useNavigate();

  useEffect(() => {
    if (!location) {
      setError("Please provide a valid location.");
      return;
    }

    const debounceFetch = setTimeout(() => {
      setLoading(true);
      setError("");

      axios
        .get(`${BASE_URL}/restaurants`, { params: { location, budget } })
        .then((response) => setRestaurants(response.data))
        .catch((error) => {
          console.error("Error fetching restaurants:", error);
          setError(
            error.response?.data?.details ||
              "Failed to load restaurants. Please try again later."
          );
        })
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(debounceFetch);
  }, [location, budget]);

  useEffect(() => {
    if (!userid?.userid) return;

    const fetchSavedRestaurants = async () => {
      try {
        const response = await axios.get(
          `${BASE_URL}/saved-restaurants/${userid.userid}`
        );
        const savedIds = new Set(response.data.map((r) => String(r.restaurant_id)));
        setSavedRestaurants(savedIds);
      } catch (error) {
        console.error("Error fetching saved restaurants:", error);
      }
    };

    fetchSavedRestaurants();
  }, [userid?.userid]);

  const navigateToGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const shareRestaurant = (restaurant) => {
    const shareText = `🍽 Check out "${restaurant.name}" in "${location}"
🏠 Address: ${restaurant.location.formatted_address}
🗺 Google Maps: https://www.google.com/maps/search/?api=1&query=${restaurant.geocodes.main.latitude},${restaurant.geocodes.main.longitude}`;

    const shareData = {
      title: restaurant.name,
      text: shareText,
    };

    if (navigator.share) {
      navigator.share(shareData).catch((error) =>
        console.error("Error sharing:", error)
      );
    } else {
      navigator.clipboard
        .writeText(shareText)
        .then(() => alert("Details copied to clipboard!"))
        .catch((error) => console.error("Error copying to clipboard:", error));
    }
  };

  const toggleSaveRestaurant = async (restaurant) => {
    if (!userid?.userid) {
      alert("Please log in to save restaurants.");
      navigate("/signin");
      return;
    }

    const restaurantIdStr = String(restaurant.id);

    try {
      if (savedRestaurants.has(restaurantIdStr)) {
        await axios.post(`${BASE_URL}/delete-restaurant`, {
          user_id: userid.userid,
          restaurantId: restaurant.id,
        });
        setSavedRestaurants((prev) => {
          const updatedSet = new Set(prev);
          updatedSet.delete(restaurantIdStr);
          return updatedSet;
        });
      } else {
        await axios.post(`${BASE_URL}/save-restaurant`, {
          user_id: userid.userid,
          restaurantId: restaurant.id,
          name: restaurant.name,
          address: restaurant.location.formatted_address,
          photo: restaurant.photo,
          latitude: restaurant.geocodes.main.latitude,
          longitude: restaurant.geocodes.main.longitude,
        });
        setSavedRestaurants((prev) => new Set([...prev, restaurantIdStr]));
      }
    } catch (error) {
      console.error("Error toggling restaurant save state:", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>Top Restaurants in {location}</h1>
      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      {!loading && restaurants.length === 0 && !error && (
        <p style={{ textAlign: "center", fontSize: "16px", color: "gray" }}>
          No restaurants available for the selected location.
        </p>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "center",
        }}
      >
        {restaurants.map((restaurant, index) => {
          const restaurantIdStr = String(restaurant.id);
          const isSaved = savedRestaurants.has(restaurantIdStr);

          return (
            <div
              key={index}
              style={{
                border: "1px solid #ccc",
                borderRadius: "10px",
                padding: "10px",
                width: "280px",
                textAlign: "center",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              onClick={() =>
                navigateToGoogleMaps(
                  restaurant.geocodes.main.latitude,
                  restaurant.geocodes.main.longitude
                )
              }
            >
              <img
                src={
                  restaurant.photo ||
                  "https://via.placeholder.com/250x150.png?text=No+Image"
                }
                alt={restaurant.name}
                style={{ width: "100%", borderRadius: "10px", height: "150px" }}
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/250x150.png?text=No+Image";
                }}
              />
              <h3>{restaurant.name}</h3>
              <p>{restaurant.location?.formatted_address || "No address available"}</p>

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
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToGoogleMaps(
                      restaurant.geocodes.main.latitude,
                      restaurant.geocodes.main.longitude
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
                    shareRestaurant(restaurant);
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
                    toggleSaveRestaurant(restaurant);
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

export default TopRestaurants;
