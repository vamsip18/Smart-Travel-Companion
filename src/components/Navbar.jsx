// import React, { useState, useEffect } from "react";
// import { Link, NavLink } from "react-router-dom";
// import { useAuth } from "../context/AuthContext.jsx";
// import "./Navbar.css";

// export const Navbar = () => {
//   const [menuOpen, setMenuOpen] = useState(false);
//   const { user } = useAuth();  

//   return (
//     <nav>
//       <Link to="/" className="title">TravelX</Link>
//       <div className="menu" onClick={() => setMenuOpen(!menuOpen)}>
//         <span></span>
//         <span></span>
//         <span></span>
//       </div>
//       <ul className={menuOpen ? "open" : ""}>
//         <li><NavLink to="/">Home</NavLink></li>
//         <li><NavLink to="/about">About Us</NavLink></li>
//         <li><NavLink to="/gallery">Gallery</NavLink></li>
//         <li><NavLink to="/contact">Contact Us</NavLink></li>
//         <li>
//           {user ? (
//             <NavLink to="/profile">Profile</NavLink>  
//           ) : (
//             <NavLink to="/signin">Sign In</NavLink>  
//           )}
//         </li>
//       </ul>
//     </nav>
//   );
// }; 


import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./Navbar.css";

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  // Function to close menu on item click
  const handleMenuItemClick = () => {
    if (menuOpen) {
      setMenuOpen(false);
    }
  };

  return (
    <nav>
      <Link to="/" className="title" onClick={handleMenuItemClick}>
        TravelX
      </Link>

      <div className="menu" onClick={() => setMenuOpen(!menuOpen)}>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <ul className={menuOpen ? "open" : ""}>
        <li>
          <NavLink to="/" onClick={handleMenuItemClick}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/about" onClick={handleMenuItemClick}>
            About Us
          </NavLink>
        </li>
        <li>
          <NavLink to="/gallery" onClick={handleMenuItemClick}>
            Gallery
          </NavLink>
        </li>
        <li>
          <NavLink to="/contact" onClick={handleMenuItemClick}>
            Contact Us
          </NavLink>
        </li>
        <li>
          {user ? (
            <NavLink to="/profile" onClick={handleMenuItemClick}>
              Profile
            </NavLink>
          ) : (
            <NavLink to="/signin" onClick={handleMenuItemClick}>
              Sign In
            </NavLink>
          )}
        </li>
      </ul>
    </nav>
  );
};
