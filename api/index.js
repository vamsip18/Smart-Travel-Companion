import express from "express";
import axios from "axios";
import cors from "cors";
import mysql from "mysql2";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// ----------------------
// Database
// ----------------------
let db = mysql.createConnection({
  host: "centerbeam.proxy.rlwy.net",
  port: 11532,
  user: "root",
  password: "SbviylOEGnApTAOmpxjZbKOEEasXPCLU",
  database: "railway",
  multipleStatements: true,
});

db.connect((err) => {
  if (err) console.error("DB connection error:", err);
  else console.log("Connected to MySQL database (Railway)");
});

// ----------------------
// Middleware
// ----------------------
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "https://smart-travel-companion.vercel.app",
      "https://smart-travel-companion-udlt.onrender.com",
      "http://localhost:8000",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Serve static images so that paths like /assets/images/restau/r1.jpeg work.
// Mounting `public` at /assets: so /assets/images/... maps to ./public/images/...
app.use("/assets", express.static(path.join(__dirname, "public")));

// ----------------------
// Coordinate cache
// ----------------------
const coordinateCache = new Map();

const getCoordinates = async (location) => {
  const cacheKey = encodeURIComponent(location);
  if (coordinateCache.has(cacheKey)) {
    const { coords, timestamp } = coordinateCache.get(cacheKey);
    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) return coords;
  }

  // simple rate-limit to be polite to Nominatim
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const response = await axios.get(
    `https://nominatim.openstreetmap.org/search?q=${cacheKey}&format=json&limit=1`,
    { headers: { "User-Agent": "SmartTravelCompanion/1.0 peelavamsi147@gmail.com" } }
  );

  if (Array.isArray(response.data) && response.data.length > 0) {
    const { lat, lon } = response.data[0];
    const coords = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    coordinateCache.set(cacheKey, { coords, timestamp: Date.now() });
    return coords;
  }
  throw new Error("No coordinates found for the given location.");
};

// ----------------------
// Unsplash fallback
// ----------------------
const fetchImageFromUnsplash = async (query) => {
  try {
    const unsplashAPI = "https://api.unsplash.com/photos/random";
    const headers = { Authorization: `Client-ID ${process.env.UNSPLASH_API_KEY}` };
    const response = await axios.get(unsplashAPI, {
      headers,
      params: { query, orientation: "landscape" },
    });
    return response.data?.urls?.small || null;
  } catch (e) {
    // don't leak internal errors to caller
    return null;
  }
};

// ----------------------
// Build photo URL (robust)
// ----------------------
const buildPhotoUrl = (photo, targetWidth = 400) => {
  try {
    if (!photo) return null;
    // If width & height exist, compute proportional size
    if (photo.width && photo.height && photo.prefix && photo.suffix) {
      const proportionalHeight = Math.round((targetWidth / photo.width) * photo.height);
      return `${photo.prefix}${targetWidth}x${proportionalHeight}${photo.suffix}`;
    }
    // Foursquare photo objects often support prefix + size + suffix, or a simple original URL.
    if (photo.prefix && photo.suffix) {
      // try a typical size token, fallback to 'original'
      return `${photo.prefix}original${photo.suffix}`;
    }
    // otherwise, if it's already a url string, return it
    if (typeof photo === "string") return photo;
    return null;
  } catch {
    return null;
  }
};

// ----------------------
// Fallback images
// ----------------------
const shuffleArray = (array) => {
  const arr = Array.isArray(array) ? [...array] : [];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const fallbackImages = {
  restaurant: shuffleArray(
    Array.from({ length: 16 }, (_, i) => {
      const ext = i + 1 <= 8 ? "jpeg" : "jpg"; // r1..r8.jpeg, r9..r16.jpg
      return `/assets/images/restau/r${i + 1}.${ext}`;
    })
  ),
  hospital: shuffleArray(
    Array.from({ length: 20 }, (_, i) => {
      const ext = i + 1 <= 12 ? "jpeg" : "jpg"; // h1..h13.jpeg, h14..h20.jpg
      return `/assets/images/hospitals/h${i + 1}.${ext}`;
    })
  ),
  "tourist attraction": shuffleArray(
    Array.from({ length: 16 }, (_, i) => `/assets/images/TouristPlaces/tourist${i + 1}.jpg`)
  ),
  temple: shuffleArray(
    Array.from({ length: 16 }, (_, i) => `/assets/images/Temples/Temple${i + 1}.jpg`)
  ),
  church: shuffleArray(
    Array.from({ length: 16 }, (_, i) => `/assets/images/churches/church${i + 1}.jpg`)
  ),
  mosque: shuffleArray(
    Array.from({ length: 16 }, (_, i) => `/assets/images/Mosques/mosque${i + 1}.jpg`)
  ),
  default: shuffleArray(
    Array.from({ length: 16 }, (_, i) => `/assets/images/Temples/Temple${i + 1}.jpg`)
  ),
};

// ----------------------
// Fixed Static Fallback (round-robin, no repeats)
// ----------------------
const fallbackCounters = {
  restaurant: 0,
  hospital: 0,
  "tourist attraction": 0,
  temple: 0,
  church: 0,
  mosque: 0,
  default: 0,
};

const getStaticFallback = (category, placeName) => {
  let chosenCategory = (category || "default").toLowerCase();
  const lowerName = (placeName || "").toLowerCase();

  if (lowerName.includes("church")) chosenCategory = "church";
  else if (lowerName.includes("mosque") || lowerName.includes("masjid")) chosenCategory = "mosque";

  // Safely pick options
  const options = Array.isArray(fallbackImages[chosenCategory]) ? fallbackImages[chosenCategory] : fallbackImages.default;

  // ensure there is at least one entry in options
  const safeOptions = Array.isArray(options) && options.length > 0 ? options : [fallbackImages.default?.[0] || ""];

  // normalize chosenCategory for counters (fallback to default if missing)
  const counterKey = fallbackCounters.hasOwnProperty(chosenCategory) ? chosenCategory : "default";
  const index = fallbackCounters[counterKey] % safeOptions.length;
  fallbackCounters[counterKey]++;

  return safeOptions[index];
};

// ----------------------
// Fetch places with fallbacks
// ----------------------
const fetchPlaces = async (location, query, limit = 10) => {
  const { latitude, longitude } = await getCoordinates(location);

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${process.env.FOURSQUARE_SERVICE_KEY}`,
    "X-Places-Api-Version": "2025-06-17",
  };

  try {
    const response = await axios.get("https://places-api.foursquare.com/places/search", {
      headers,
      params: { ll: `${latitude},${longitude}`, query, radius: 5000, limit },
      timeout: 10000,
    });

    const places = Array.isArray(response.data?.results) ? response.data.results : [];

    const placesWithImages = await Promise.all(
      places.map(async (place) => {
        let photo = null;

        // 1. Foursquare Photo (v3 style: array of photo objects)
        try {
          const photoResponse = await axios.get(
            `https://places-api.foursquare.com/places/${place.fsq_place_id}/photos`,
            { headers, params: { limit: 1, sort: "POPULAR" }, timeout: 8000 }
          );
          // photoResponse.data might be an array
          if (Array.isArray(photoResponse.data) && photoResponse.data.length > 0) {
            const p = photoResponse.data[0];
            // p may be an object with prefix/suffix/width/height
            photo = buildPhotoUrl(p, 400) || null;
          }
        } catch (e) {
          // ignore; we try other fallbacks
        }

        // 2. Unsplash
        if (!photo) {
          try {
            photo = await fetchImageFromUnsplash(place.name);
          } catch {}
        }

        // 3. Static fallback (before category icon)
        if (!photo) {
          photo = getStaticFallback(query, place.name);
        }

        // 4. Category Icon (only last resort)
        if (!photo && Array.isArray(place.categories) && place.categories.length > 0) {
          const catIcon = place.categories[0].icon;
          if (catIcon?.prefix && catIcon?.suffix) {
            photo = `${catIcon.prefix}bg_120${catIcon.suffix}`;
          }
        }

        // 5. Final guard (never null)
        if (!photo) photo = fallbackImages.default?.[0] || "";

        // geocodes
        const lat = place.geocodes?.main?.latitude ?? (place.latitude ? parseFloat(place.latitude) : null);
        const lng = place.geocodes?.main?.longitude ?? (place.longitude ? parseFloat(place.longitude) : null);

        return {
          id: place.fsq_place_id || place.fsq_id || uuidv4(),
          name: place.name || "",
          location: place.location || {},
          geocodes: place.geocodes || (lat && lng ? { main: { latitude: lat, longitude: lng } } : {}),
          photo,
        };
      })
    );

    return placesWithImages;
  } catch (error) {
    console.error(`Error fetching ${query}:`, error?.response?.data || error.message || error);
    return [];
  }
};

// ----------------------
// AUTH ENDPOINTS
// ----------------------
// Register
app.post("/register", async (req, res) => {
  const { fullname, email, phone, password } = req.body;
  if (!fullname || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: "All fields are required!" });
  }
  try {
    const userId = uuidv4();
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (id, fullname, email, phone, password) VALUES (?, ?, ?, ?, ?)",
      [userId, fullname, email, phone, hashed],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
              success: false,
              message: "User with this email already exists!",
            });
          }
          console.error("Register DB error:", err);
          return res.status(500).json({ success: false, message: "Database error" });
        }
        res.status(201).json({ success: true, message: "Registration successful!" });
      }
    );
  } catch (e) {
    console.error("Register error:", e);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required!" });
  }
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, rows) => {
    if (err) {
      console.error("Login DB error:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password!" });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid email or password!" });
    }
    res.json({
      success: true,
      message: "Login successful!",
      user: { id: user.id, fullname: user.fullname, email: user.email, phone: user.phone },
    });
  });
});

// Get user ID from email
app.get("/get-user-id", (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  db.query("SELECT id FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Error fetching user ID:", err);
      return res.status(500).json({ error: "Failed to fetch user ID" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ userId: results[0].id });
  });
});

// GET user details by email
app.get("/get-user-details", (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  console.log(email);
  const sql = "SELECT fullname, phone FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user details:", err);
      return res.status(500).json({ message: "Server error" });
    }
   if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = results[0];
    res.json({
      fullname: user.fullname,
      phone: user.phone,
    });
  });
});

// PUT /update-user-details
app.put("/update-user-details", async (req, res) => {
  const { email, fullname, phonenumber } = req.body;

  if (!email || !fullname || !phonenumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const updateQuery = `
      UPDATE users
      SET fullname = ?, phone = ?
      WHERE email = ?
    `;

    await db.promise().query(updateQuery, [fullname, phonenumber, email]);

    const [updatedUserRows] = await db.promise().query(
      "SELECT email, fullname, phone FROM users WHERE email = ?",
      [email]
    );
    res.json(updatedUserRows[0] || {});
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({ error: "Failed to update user details" });
  }
});

// ----------------------
// CRUD + SAVE ENDPOINTS (Restaurants, Hospitals, Tourist Places, Religious Sites, Events)
// ----------------------
// 👉 For brevity, I’ll keep the structure identical to what you had: INSERT, GET by user_id

// Save a restaurant
app.post("/save-restaurant", (req, res) => {
  const { user_id, restaurantId, name, address, photo, latitude, longitude } = req.body;

  if (!user_id || !restaurantId || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `
    INSERT INTO saved_restaurants (user_id, restaurant_id, name, address, photo, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      name = VALUES(name), 
      address = VALUES(address), 
      photo = VALUES(photo), 
      latitude = VALUES(latitude), 
      longitude = VALUES(longitude)
  `;

  db.query(
    query,
    [
      user_id,
      restaurantId,
      name,
      address || "",
      photo || "",
      latitude || null,
      longitude || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Error saving restaurant:", err);
        return res.status(500).json({ error: "Failed to save restaurant" });
      }
      res.status(200).json({ success: true, message: "Restaurant saved successfully!" });
    }
  );
});


// Get all saved restaurants for a user
app.get("/saved-restaurants/:user_id", (req, res) => {
  const userId = req.params.user_id;

  db.query("SELECT * FROM saved_restaurants WHERE user_id = ?", [userId], (err, results) => {
    if (err) {
      console.error("Error fetching saved restaurants:", err);
      return res.status(500).json({ error: "Failed to fetch saved restaurants" });
    }
    res.json(results || []); // frontend expects an array
  });
});


// Delete a saved restaurant
app.post("/delete-restaurant", (req, res) => {
  const { user_id, restaurantId } = req.body;

  if (!user_id || !restaurantId) {
    return res.status(400).json({ message: "Missing user_id or restaurantId" });
  }

  // Adjust this query depending on your table structure
  const query = `
    DELETE FROM saved_restaurants 
    WHERE user_id = ? 
    AND restaurant_id = ?
  `;

  db.query(query, [user_id, restaurantId], (err, result) => {
    if (err) {
      console.error("Error deleting saved restaurant:", err);
      return res.status(500).json({ error: "Failed to delete saved restaurant" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Saved restaurant not found" });
    }

    res.json({ success: true, message: "Restaurant unsaved" });
  });
});


// -----------------------------
// SAVED: EVENTS
// -----------------------------
app.post("/save-event", (req, res) => {
  const {
    userId,
    eventId,
    name,
    venue,
    city,
    country,
    date,
    time,
    latitude,
    longitude,
    image,
    url,
  } = req.body || {};
  if (!userId) return res.status(401).json({ error: "User not logged in" });
  if (!eventId) return res.status(400).json({ error: "Missing event ID" });

  const query = `
    INSERT INTO saved_events (user_id, event_id, name, venue, city, country, date, time, latitude, longitude, image, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE name=?, venue=?, city=?, country=?, date=?, time=?, latitude=?, longitude=?, image=?, url=?
  `;
  db.query(
    query,
    [
      userId,
      eventId,
      name || "",
      venue || "",
      city || "",
      country || "",
      date || null,
      time || "",
      latitude || null,
      longitude || null,
      image || "",
      url || "",
      name || "",
      venue || "",
      city || "",
      country || "",
      date || null,
      time || "",
      latitude || null,
      longitude || null,
      image || "",
      url || "",
    ],
    (err) => {
      if (err) {
        console.error("Error saving event:", err);
        return res.status(500).json({ error: "Failed to save event" });
      }
      res.json({ success: true, message: "Event saved successfully!" });
    }
  );
});

app.get("/saved-events/:userId", (req, res) => {
  const userId = req.params.userId;
  db.query(
    "SELECT id, event_id, name, venue, city, country, date, time, latitude, longitude, image, url FROM saved_events WHERE user_id = ?",
    [userId],
    (err, rows) => {
      if (err) {
        console.error("Error fetching saved events:", err);
        return res.status(500).json({ error: "Failed to fetch saved events" });
      }
      res.json(rows || []);
    }
  );
});

app.delete("/delete-event/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM saved_events WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Error deleting event:", err);
      return res.status(500).json({ error: "Failed to delete event" });
    }
    res.json({ success: true, message: "Event deleted successfully" });
  });
});

app.post("/delete-event", (req, res) => {
  const { userId, eventId } = req.body || {};
  if (!userId || !eventId) {
    return res.status(400).json({ message: "Missing required parameters" });
  }
  db.query(
    "DELETE FROM saved_events WHERE user_id = ? AND event_id = ?",
    [userId, eventId],
    (err, result) => {
      if (err) {
        console.error("Error deleting event:", err);
        return res.status(500).json({ message: "Error deleting event" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({ message: "Event unsaved successfully" });
    }
  );
});

// // Save hospital to profile
app.post("/save-hospital", (req, res) => {
  const { userId, hospitalId, name, address, photo, latitude, longitude } = req.body;
  if (!userId) {
    return res.status(401).json({ error: "User not logged in" });
  }
  const query = `
    INSERT INTO saved_hospitals (user_id, hospital_id, name, address, photo, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    address = VALUES(address),
    photo = VALUES(photo),
    latitude = VALUES(latitude),
    longitude = VALUES(longitude)
  `;
  db.query(
    query,
    [userId, hospitalId, name, address, photo, latitude, longitude],
    (err, result) => {
      if (err) {
        console.error("Error saving hospital:", err);
        return res.status(500).json({ error: "Failed to save hospital" });
      }
      res.status(200).json({ message: "Hospital saved successfully!" });
    }
  );
});

// Get saved hospitals for a user
app.get("/saved-hospitals/:userId", (req, res) => {
  const userId = req.params.userId;
  db.query(
    "SELECT id, hospital_id, name, address, photo, latitude, longitude FROM saved_hospitals WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("Error fetching saved hospitals:", err);
        return res.status(500).json({ error: "Failed to fetch saved hospitals" });
      }
      res.json(results);
    }
  );
});

// Delete a saved hospital by ID
app.delete("/delete-hospital/:id", (req, res) => {
  const hospitalId = req.params.id;
  db.query(
    "DELETE FROM saved_hospitals WHERE id = ?",
    [hospitalId],
    (err, result) => {
      if (err) {
        console.error("Error deleting hospital:", err);
        return res.status(500).json({ error: "Failed to delete hospital" });
      }
      res.json({ success: true, message: "Hospital deleted successfully" });
    }
  );
});

// Unsave hospital for a user
app.post("/delete-hospital", (req, res) => {
  const { userId, hospitalId } = req.body;
  if (!userId || !hospitalId) {
    return res.status(400).json({ message: "Missing required parameters" });
  }
  const query = "DELETE FROM saved_hospitals WHERE user_id = ? AND hospital_id = ?";
  db.query(query, [userId, hospitalId], (err, result) => {
    if (err) {
      console.error("Error deleting hospital:", err);
      return res.status(500).json({ message: "Error deleting hospital" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    res.json({ message: "Hospital unsaved successfully" });
  });
});

// Save a place to profile
app.post("/save-place", (req, res) => {
  const { userId, placeId, name, address, latitude, longitude, image } = req.body;
  if (!userId) {
    return res.status(401).json({ error: "User not logged in" });
  }
  const query = `
    INSERT INTO saved_places (user_id, place_id, name, address, latitude, longitude, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      address = VALUES(address),
      latitude = VALUES(latitude),
      longitude = VALUES(longitude),
      image = VALUES(image)
  `;
  db.query(
    query,
    [userId, placeId, name, address, latitude, longitude, image],
    (err, result) => {
      if (err) {
        console.error("Error saving place:", err);
        return res.status(500).json({ error: "Failed to save place" });
      }
      res.json({ success: true, message: "Place saved successfully" });
    }
  );
});

// Delete a saved place
app.post("/delete-place", (req, res) => {
  const { userId, placeId } = req.body;
  const query = "DELETE FROM saved_places WHERE user_id = ? AND place_id = ?";
  db.query(query, [userId, placeId], (err, result) => {
    if (err) {
      console.error("Error deleting place:", err);
      return res.status(500).json({ error: "Failed to delete place" });
    }
    res.json({ success: true, message: "Place deleted successfully" });
  });
});

// Get saved places for a user
app.get("/saved-places/:userId", (req, res) => {
  // console.log(req.params.userId);
  const userId = req.params.userId;
  const query = "SELECT * FROM saved_places WHERE user_id = ?";
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching saved places:", err);
      return res.status(500).json({ error: "Failed to fetch saved places" });
    }
    res.json(results);
  });
});

// Save a site to profile
app.post("/save-site", (req, res) => {
  const { userId, siteId, name, address, photo, latitude, longitude } = req.body;
  if (!userId) {
    return res.status(401).json({ error: "User not logged in" });
  }
  const query = `
    INSERT INTO saved_sites (user_id, site_id, name, address, photo, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      address = VALUES(address),
      photo = VALUES(photo),
      latitude = VALUES(latitude),
      longitude = VALUES(longitude)
  `;
  db.query(
    query,
    [userId, siteId, name, address, photo, latitude, longitude],
    (err, result) => {
      if (err) {
        console.error("Error saving site:", err);
        return res.status(500).json({ error: "Failed to save site" });
      }
      res.json({ success: true, message: "Site saved successfully" });
    }
  );
});

// Delete a saved site
app.post("/delete-site", (req, res) => {
  const { userId, siteId } = req.body;
  const query = "DELETE FROM saved_sites WHERE user_id = ? AND site_id = ?";
  db.query(query, [userId, siteId], (err, result) => {
    if (err) {
      console.error("Error deleting site:", err);
      return res.status(500).json({ error: "Failed to delete site" });
    }
    res.json({ success: true, message: "Site deleted successfully" });
  });
});

app.get("/saved-sites/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = "SELECT * FROM saved_sites WHERE user_id = ?";
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching saved sites:", err);
      return res.status(500).json({ error: "Failed to fetch saved sites" });
    }
    res.json(results);
  });
});


// ----------------------
// FETCH PLACES ENDPOINTS
// ----------------------
app.get("/fetch-restaurants", async (req, res) => {
  const { location } = req.query;
  if (!location) return res.status(400).json({ success: false, message: "Location required" });
  try {
    const results = await fetchPlaces(location, "restaurant", 20);
    res.json({ success: true, results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Error fetching restaurants" });
  }
});

app.get("/fetch-hospitals", async (req, res) => {
  const { location } = req.query;
  if (!location) return res.status(400).json({ success: false, message: "Location required" });
  try {
    const results = await fetchPlaces(location, "hospital", 20);
    res.json({ success: true, results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Error fetching hospitals" });
  }
});

app.get("/fetch-places", async (req, res) => {
  const { location } = req.query;
  if (!location) return res.status(400).json({ success: false, message: "Location required" });
  try {
    const results = await fetchPlaces(location, "tourist attraction", 20);
    res.json({ success: true, results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Error fetching tourist places" });
  }
});

app.get("/religious-sites", async (req, res) => {
  const { location } = req.query;
  if (!location) return res.status(400).json({ success: false, message: "Location required" });
  try {
    const temples = await fetchPlaces(location, "temple", 10);
    const mosques = await fetchPlaces(location, "mosque", 10);
    const churches = await fetchPlaces(location, "church", 10);
    res.json({ success: true, results: [...temples, ...mosques, ...churches] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Error fetching religious sites" });
  }
});

// -----------------------------
// LIVE EVENTS (Ticketmaster)
// -----------------------------
app.get("/live-events", async (req, res) => {
  const { location, date: eventDate } = req.query || {};
  if (!location || !eventDate) {
    return res.status(400).json({ error: "Location and date are required" });
  }

  const ticketmasterAPI = "https://app.ticketmaster.com/discovery/v2/events.json";
  const params = {
    apikey: process.env.TICKETMASTER_API_KEY,
    city: location,
    startDateTime: `${eventDate}T00:00:00Z`,
    radius: 50,
    classificationName: "festival,cinema,comedy,music,sports",
    size: 16,
    sort: "date,asc",
  };

  try {
    const response = await axios.get(ticketmasterAPI, { params, timeout: 10000 });
    if (response.data._embedded && response.data._embedded.events) {
      const events = response.data._embedded.events
        .filter((event) => event.dates?.start?.localDate === eventDate)
        .map((event) => ({
          id: event.id,
          name: event.name,
          venue: event._embedded?.venues?.[0]?.name || "TBD",
          address: event._embedded?.venues?.[0]?.address?.line1 || "Address not available",
          city: event._embedded?.venues?.[0]?.city?.name || "",
          country: event._embedded?.venues?.[0]?.country?.name || "",
          date: event.dates?.start?.localDate || "",
          time: event.dates?.start?.localTime || "TBD",
          image: event.images?.[0]?.url || "",
          latitude: event._embedded?.venues?.[0]?.location?.latitude || null,
          longitude: event._embedded?.venues?.[0]?.location?.longitude || null,
          url: event.url || "",
        }));
      res.json(events);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error("Error fetching events:", error?.response?.data || error.message || error);
    res.status(500).json({
      error: "Failed to fetch event data",
      details: error?.response?.data || error.message,
    });
  }
});

// ----------------------
// Start server
// ----------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
