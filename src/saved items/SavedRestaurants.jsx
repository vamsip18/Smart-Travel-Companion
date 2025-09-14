import React, { useEffect, useState } from "react";
import axios from "axios";
import ShareIcon from "@mui/icons-material/Share";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useAuth } from "../context/AuthContext";

const SavedRestaurants = () => {
  const { user } = useAuth();
  const [savedRestaurants, setSavedRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = "https://smart-travel-companion-udlt.onrender.com";

  // Utility: normalize many possible response shapes to an array
  const normalizeArray = (resp) => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.results)) return resp.results;
    if (Array.isArray(resp.restaurants)) return resp.restaurants;
    if (Array.isArray(resp.data)) return resp.data;
    // sometimes the array is nested: { success: true, results: [...] }
    for (const key of Object.keys(resp)) {
      if (Array.isArray(resp[key])) return resp[key];
    }
    return [];
  };

  useEffect(() => {
    if (!user?.email) return;

    const fetchSavedRestaurants = async () => {
      setLoading(true);
      try {
        const userRes = await axios.get(`${API_BASE}/get-user-id`, { params: { email: user.email } });
        const userId = userRes?.data?.userId || userRes?.data?.user_id || null;
        if (!userId) {
          console.warn("No userId returned from get-user-id:", userRes.data);
          setSavedRestaurants([]);
          return;
        }

        const restaurantRes = await axios.get(`${API_BASE}/saved-restaurants/${userId}`);
        console.log("saved-restaurants response:", restaurantRes.data);

        const normalized = normalizeArray(restaurantRes.data);
        setSavedRestaurants(normalized);
      } catch (err) {
        console.error("Error fetching saved restaurants:", err);
        setSavedRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedRestaurants();
  }, [user]);

  const navigateToGoogleMaps = (lat, lng) => {
    if (!lat || !lng) {
      alert("Coordinates are not available for this place.");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const shareRestaurant = (restaurant) => {
    const lat = restaurant.latitude ?? restaurant.lat ?? restaurant?.geocodes?.main?.latitude;
    const lng = restaurant.longitude ?? restaurant.lng ?? restaurant?.geocodes?.main?.longitude;
    const shareText = `🍽 Check out "${restaurant.name}" at "${restaurant.address || ""}"
Google Maps: https://www.google.com/maps/search/?api=1&query=${lat || ""},${lng || ""}`;
    const shareData = { title: restaurant.name, text: shareText };
    if (navigator.share) {
      navigator.share(shareData).catch((err) =>
        console.error("Share error:", err)
      );
    } else {
      // fallback - copy to clipboard (best-effort)
      navigator.clipboard?.writeText(shareText).then(() => {
        alert("Share text copied to clipboard");
      }).catch(() => {
        alert("Sharing not supported; copied text unavailable.");
      });
    }
  };

  // unsave: allow both restaurant_id and id as DB columns
  const unsaveRestaurant = async (restaurantId) => {
    try {
      const userRes = await axios.get(`${API_BASE}/get-user-id`, { params: { email: user.email } });
      const userId = userRes?.data?.userId || userRes?.data?.user_id;
      if (!userId) throw new Error("User ID not available");

      // endpoint assumed: POST /delete-restaurant { user_id, restaurantId }
      await axios.post(`${API_BASE}/delete-restaurant`, {
        user_id: userId,
        restaurantId,
      });

      setSavedRestaurants((prev) =>
        prev.filter((r) => {
          const id = r.restaurant_id ?? r.id ?? r.place_id ?? r.event_id;
          return String(id) !== String(restaurantId);
        })
      );
    } catch (err) {
      console.error("Error unsaving restaurant:", err);
      alert("Failed to remove saved restaurant. Check console/logs.");
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: "center", marginTop: "40px" }}>Saved Restaurants</h2>
      {loading ? (
        <p style={{ textAlign: "center", color: "gray" }}>Loading...</p>
      ) : !Array.isArray(savedRestaurants) || savedRestaurants.length === 0 ? (
        <p style={{ textAlign: "center", color: "gray" }}>No saved restaurants.</p>
      ) : (
        <div style={{
            display: "flex",
            overflowX: "auto",
            gap: "20px",
            padding: "10px",
            marginTop: "20px",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
          {savedRestaurants.map((restaurant, idx) => {
            const id = restaurant.restaurant_id ?? restaurant.id ?? restaurant.place_id ?? idx;
            const photo = restaurant.photo || restaurant.image || restaurant.img || "";
            const address = restaurant.address || restaurant.location?.formatted_address || restaurant.location?.address || "";
            const lat = restaurant.latitude ?? restaurant.lat ?? restaurant.geocodes?.main?.latitude;
            const lng = restaurant.longitude ?? restaurant.lng ?? restaurant.geocodes?.main?.longitude;

            return (
              <div key={id}
                style={{
                  flex: "0 0 auto",
                  scrollSnapAlign: "start",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  width: "345px",
                  padding: "10px",
                  backgroundColor: "#fff",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                }}
                onClick={() => navigateToGoogleMaps(lat, lng)}
              >
                <img
                  src={photo || "https://via.placeholder.com/250x150.png?text=No+Image"}
                  alt={restaurant.name}
                  style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "10px" }}
                  onError={(e) => (e.target.src = "https://via.placeholder.com/250x150.png?text=No+Image")}
                />
                <h3 style={{ margin: "10px 0 5px" }}>{restaurant.name}</h3>
                <p style={{ color: "#666", fontSize: "14px" }}>{address}</p>

                <div style={{ marginTop: "auto", display: "flex", justifyContent: "center", gap: "8px", paddingTop: "10px" }}>
                  <button style={buttonStyle("navy")} onClick={(e) => { e.stopPropagation(); navigateToGoogleMaps(lat, lng); }}>
                    Directions
                  </button>
                  <button style={buttonStyle("#28a745")} onClick={(e) => { e.stopPropagation(); shareRestaurant(restaurant); }}>
                    <ShareIcon />
                  </button>
                  <button style={buttonStyle("#6c757d")} onClick={(e) => { e.stopPropagation(); unsaveRestaurant(id); }}>
                    <FavoriteIcon style={{ color: "red" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const buttonStyle = (bgColor) => ({
  padding: "6px 12px",
  backgroundColor: bgColor,
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
});

export default SavedRestaurants;
