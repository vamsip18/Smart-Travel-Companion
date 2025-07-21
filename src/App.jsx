// import { Route, Routes } from "react-router-dom";
// import { useState } from "react";
// import "./App.css";
// import { Navbar } from "./components/Navbar";
// import Footer from "./components/Footer/Footer";
// import { About, Contact, Home, Gallery, Profile, SignIn, Register } from "./pages";
// import { AuthProvider } from "./context/AuthContext";

// function App() {
//   const [userid, setUserid] = useState("");
//   const [menuOpen, setMenuOpen] = useState(false);

//   const handleLogin = (user_id) => {
//     setUserid(user_id);
//   }

//   return (
//     <AuthProvider>
//       <div className="App">
//         <Navbar />
//         {/* Wrap Routes in a div with the class 'main-content' */}
//         <div className="main-content">
//           <Routes>
//             <Route path="/" element={<Home userid={userid}/>} />
//             <Route path="/about" element={<About />} />
//             <Route path="/gallery" element={<Gallery />} />
//             <Route path="/contact" element={<Contact />} />
//             <Route path="/signin" element={<SignIn handleLogin={handleLogin} />} />
//             <Route path="/register" element={<Register />} />
//             <Route path="/profile" element={<Profile />} />
//           </Routes>
//         </div>

//       </div>
//       <Footer/>
//     </AuthProvider>
//   );
// }

// export default App;


import { Route, Routes } from "react-router-dom";
import { useState } from "react";
import "./App.css";
import { Navbar } from "./components/Navbar";
import Footer from "./components/Footer/Footer";
import { About, Contact, Home, Gallery, Profile, SignIn, Register } from "./pages";
import { AuthProvider } from "./context/AuthContext";

function App() {
  const [userid, setUserid] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogin = (user_id) => {
    setUserid(user_id);
  };

  return (
    <AuthProvider>
      <div className="App">
        <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home userid={userid} menuOpen={menuOpen} />} />
            <Route path="/about" element={<About menuOpen={menuOpen} />} />
            <Route path="/gallery" element={<Gallery menuOpen={menuOpen} />} />
            <Route path="/contact" element={<Contact menuOpen={menuOpen} />} />
            <Route path="/signin" element={<SignIn handleLogin={handleLogin} menuOpen={menuOpen} />} />
            <Route path="/register" element={<Register menuOpen={menuOpen} />} />
            <Route path="/profile" element={<Profile menuOpen={menuOpen} />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
