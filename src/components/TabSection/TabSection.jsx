import React, { useState } from "react";
import "./TabSection.css";
import TopRestaurants from "../TopRestaurants/Restaurants";
import TouristPlaces from "../TouristPlaces/TouristPlaces";
import LiveEvents from "../LiveEvents/LiveEvents";
import Hospitals from "../Hospitals/Hospitals";
import WeatherInfo from "../WeatherInfo/WeatherInfo";
import Temples from "../Temples/Temples";

const TabSection = ({ location, date, userid }) => {
  const [activeTab, setActiveTab] = useState("TouristPlaces");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { key: "TouristPlaces", label: "Tourist Places" },
    { key: "Restaurants", label: "Restaurants" },
    { key: "Live Events", label: "Live Events" },
    { key: "Hospitals", label: "Hospitals" },
    { key: "Weather Info", label: "Weather Info" },
    { key: "Temples", label: "Temples" },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleTabClick = (key) => {
    setActiveTab(key);
    setIsMobileMenuOpen(false);
  };

  const renderTabButton = (tab) => (
    <button
      key={tab.key}
      className={activeTab === tab.key ? "active" : ""}
      onClick={() => handleTabClick(tab.key)}
    >
      {tab.label}
    </button>
  );

  return (
    <div className="tab-container">
      {/* Desktop Tabs */}
      <div className="tabs desktop-tabs">
        {tabs.map(renderTabButton)}
      </div>

      {/* Mobile Toggle Tab */}
      {/* Mobile Toggle Bar */}
<div className="mobile-tabs">
  <div className="mobile-toggle-bar">
    <span className="selected-tab-title">
      {tabs.find((tab) => tab.key === activeTab)?.label}
    </span>
    <button className="toggle-btn-icon" onClick={toggleMobileMenu}>
      ☰
    </button>
  </div>

  {isMobileMenuOpen && (
    <div className="mobile-toggle-list">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={activeTab === tab.key ? "active" : ""}
          onClick={() => handleTabClick(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )}
</div>


      {/* Tab Content */}
      <div className="tab-content">
        <div className={activeTab === "TouristPlaces" ? "tab-panel active" : "tab-panel"}>
          <TouristPlaces location={location} userid={userid} />
        </div>
        <div className={activeTab === "Restaurants" ? "tab-panel active" : "tab-panel"}>
          <TopRestaurants location={location} userid={userid} />
        </div>
        <div className={activeTab === "Live Events" ? "tab-panel active" : "tab-panel"}>
          <LiveEvents location={location} date={date} userid={userid} />
        </div>
        <div className={activeTab === "Hospitals" ? "tab-panel active" : "tab-panel"}>
          <Hospitals location={location} userid={userid} />
        </div>
        <div className={activeTab === "Weather Info" ? "tab-panel active" : "tab-panel"}>
          <WeatherInfo location={location} date={date} />
        </div>
        <div className={activeTab === "Temples" ? "tab-panel active" : "tab-panel"}>
          <Temples location={location} userid={userid} />
        </div>
      </div>
    </div>
  );
};

export default TabSection;






// import React, { useState } from "react";
// import TopRestaurants from "../TopRestaurants/Restaurants";
// import TouristPlaces from "../TouristPlaces/TouristPlaces";
// import LiveEvents from "../LiveEvents/LiveEvents";
// import Hospitals from "../Hospitals/Hospitals";
// import WeatherInfo from "../WeatherInfo/WeatherInfo";
// import Temples from "../Temples/Temples";
// import "./TabSection.css";

// const TabSection = ({ location, date ,userid }) => {
//   const [activeTab, setActiveTab] = useState("TouristPlaces");

//   const tabs = [
//     { key: "TouristPlaces", label: "Tourist Places" },
//     { key: "Restaurants", label: "Restaurants" },
//     { key: "Live Events", label: "Live Events" },
//     { key: "Hospitals", label: "Hospitals" },
//     { key: "Weather Info", label: "Weather Info" },
//     { key: "Temples", label: "Temples" },
//   ];

//   return (
//     <div className="tab-container">
//       {/* Tab Navigation */}
//       <div className="tabs">
//         {tabs.map((tab) => (
//           <button
//             key={tab.key}
//             className={activeTab === tab.key ? "active" : ""}
//             onClick={() => setActiveTab(tab.key)}
//           >
//             {tab.label}
//           </button>
//         ))}
//       </div>

//       {/* Tab Content (All rendered, only one shown) */}
//       <div className="tab-content">
//         <div className={activeTab === "TouristPlaces" ? "tab-panel active" : "tab-panel"}>
//           <TouristPlaces location={location} userid={userid}/>
//         </div>
//         <div className={activeTab === "Restaurants" ? "tab-panel active" : "tab-panel"}>
//           <TopRestaurants location={location} userid={userid} />
//         </div>
//         <div className={activeTab === "Live Events" ? "tab-panel active" : "tab-panel"}>
//           <LiveEvents location={location} date={date} userid={userid} />
//         </div>
//         <div className={activeTab === "Hospitals" ? "tab-panel active" : "tab-panel"}>
//           <Hospitals location={location} userid={userid}/>
//         </div>
//         <div className={activeTab === "Weather Info" ? "tab-panel active" : "tab-panel"}>
//           <WeatherInfo location={location} date={date}/>
//         </div>
//         <div className={activeTab === "Temples" ? "tab-panel active" : "tab-panel"}>
//           <Temples location={location} userid={userid}/>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TabSection;