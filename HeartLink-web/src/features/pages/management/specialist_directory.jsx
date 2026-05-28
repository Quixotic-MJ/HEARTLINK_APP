import React, { useState } from "react";
import {
  Search,
  Plus,
  MapPin,
  Filter,
  MoreVertical,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  Trash2,
  Stethoscope,
  Phone,
  Mail,
  Building,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/AdminLayout"; // Adjust path

// Mock Data localized to Cebu City
const initialSpecialists = [
  {
    id: 1,
    name: "Dr. Maria Santos, MD, FACC",
    clinic: "Cebu Doctors' University Hospital",
    address: "Osmeña Blvd, Cebu City",
    lat: 10.3111,
    lng: 123.8922,
    phone: "+63 (32) 255 5555",
    email: "dr.santos@cebudoc.com",
    status: "active",
  },
  {
    id: 2,
    name: "Dr. Juan Dela Cruz, MD, FPCC",
    clinic: "Chong Hua Hospital",
    address: "Fuente Osmeña Cir, Cebu City",
    lat: 10.3118,
    lng: 123.8953,
    phone: "+63 (32) 255 8000",
    email: "jdelacruz.cardio@chonghua.com.ph",
    status: "active",
  },
  {
    id: 3,
    name: "Dr. Elena Reyes, MD",
    clinic: "Perpetual Succour Hospital",
    address: "Gorordo Ave, Cebu City",
    lat: 10.3175,
    lng: 123.8967,
    phone: "+63 (32) 233 8620",
    email: "ereyes@perpetual.com.ph",
    status: "inactive",
  },
  {
    id: 4,
    name: "Dr. Carlos Lim, MD, FACC",
    clinic: "Visayas Community Medical Center",
    address: "Osmeña Blvd, Cebu City",
    lat: 10.3082,
    lng: 123.8931,
    phone: "+63 (32) 253 1901",
    email: "clim.heart@vcmc.ph",
    status: "pending",
  },
];

const Specialists = () => {
  const [specialists, setSpecialists] = useState(initialSpecialists);
  const [selectedSpecialist, setSelectedSpecialist] = useState(
    initialSpecialists[0],
  );
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Simulated Map Coordinates State (Hard-centered on Cebu City)
  const [mapCoords, setMapCoords] = useState({
    lat: selectedSpecialist?.lat || 10.3157,
    lng: selectedSpecialist?.lng || 123.8854,
  });

  // Boundary Validation Simulation (Rough coordinates for Cebu City)
  const isWithinCebuCity = (lat, lng) => {
    // Highly simplified bounding box for Cebu City bounds
    const minLat = 10.25;
    const maxLat = 10.45;
    const minLng = 123.8;
    const maxLng = 123.95;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  };

  const handleSelectSpecialist = (doctor) => {
    setSelectedSpecialist(doctor);
    setMapCoords({ lat: doctor.lat, lng: doctor.lng });
  };

  const handleStatusToggle = (id) => {
    setSpecialists(
      specialists.map((doc) => {
        if (doc.id === id) {
          return {
            ...doc,
            status: doc.status === "active" ? "inactive" : "active",
          };
        }
        return doc;
      }),
    );
  };

  const filteredSpecialists = specialists.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.clinic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            Geographic Data
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Specialist <span className="text-[#1e4ed8]">Directory.</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-colors">
            <UploadCloud size={14} /> Import CSV
          </button>
          <button className="flex items-center gap-1.5 bg-[#1e4ed8] hover:bg-[#113296] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm shadow-blue-900/20 transition-colors">
            <Plus size={14} strokeWidth={2.5} /> Add Specialist
          </button>
        </div>
      </div>

      {/* Split Screen Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
        {/* ========================================= */}
        {/* LEFT PANE: Directory List                 */}
        {/* ========================================= */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-gray-50 bg-[#f8fafc]">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search doctors or clinics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:ring-1 focus:ring-[#1e4ed8]/20 transition-all"
                />
              </div>
              <div className="relative">
                <Filter
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-8 pr-8 py-2 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <div className="space-y-1.5">
              {filteredSpecialists.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectSpecialist(doc)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSpecialist?.id === doc.id
                      ? "bg-blue-50 border-blue-200 shadow-sm"
                      : "bg-white border-transparent hover:border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        doc.status === "active"
                          ? "bg-green-100 text-green-600"
                          : doc.status === "inactive"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      <Stethoscope size={14} />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold leading-tight mb-0.5 ${selectedSpecialist?.id === doc.id ? "text-[#1e4ed8]" : "text-gray-900"}`}
                      >
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Building size={10} /> {doc.clinic}
                      </p>
                    </div>
                  </div>

                  {/* Status Toggle (Mock) */}
                  <div
                    className="flex flex-col items-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={doc.status === "active"}
                        onChange={() => handleStatusToggle(doc.id)}
                        disabled={doc.status === "pending"}
                      />
                      <div
                        className={`w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${
                          doc.status === "active"
                            ? "peer-checked:bg-[#1e4ed8]"
                            : doc.status === "pending"
                              ? "bg-yellow-200 cursor-not-allowed opacity-50"
                              : ""
                        }`}
                      ></div>
                    </label>
                    <span
                      className={`text-[8px] font-bold uppercase tracking-wider ${
                        doc.status === "active"
                          ? "text-[#1e4ed8]"
                          : doc.status === "inactive"
                            ? "text-gray-400"
                            : "text-yellow-600"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* RIGHT PANE: Geographic Editor & Preview   */}
        {/* ========================================= */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-[#f8fafc]">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <MapPin size={14} className="text-[#1e4ed8]" /> Geographic Editor
            </h3>
            <div className="flex gap-2">
              <button className="text-[10px] font-bold text-gray-500 hover:text-red-600 transition-colors px-2 py-1 flex items-center gap-1">
                <Trash2 size={12} /> Archive
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Google Maps Preview Widget (Mock CSS Map) */}
            <div className="w-full h-56 bg-blue-50 relative border-b border-gray-100 overflow-hidden group">
              {/* CSS Grid to simulate map tiles */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(#1e4ed8 1px, transparent 1px), linear-gradient(90deg, #1e4ed8 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              ></div>

              {/* Centered Map Marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pb-2 flex flex-col items-center animate-bounce">
                <div className="bg-[#1e4ed8] text-white p-2 rounded-full shadow-lg border-2 border-white relative z-10">
                  <Stethoscope size={16} />
                </div>
                <div className="w-3 h-1 bg-black/20 rounded-full mt-1 blur-[1px]"></div>
              </div>

              {/* Map UI Overlay Elements */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">
                  Cebu City Bounds Active
                </span>
              </div>

              <div className="absolute bottom-3 right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-6 h-6 bg-white rounded shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#1e4ed8]">
                  +
                </button>
                <button className="w-6 h-6 bg-white rounded shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#1e4ed8]">
                  -
                </button>
              </div>
            </div>

            {/* Data Entry Form */}
            <div className="p-6">
              {/* Boundary Validation Alert */}
              {!isWithinCebuCity(mapCoords.lat, mapCoords.lng) ? (
                <div className="mb-6 bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2.5">
                  <AlertCircle
                    size={16}
                    className="text-red-500 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider mb-0.5">
                      Boundary Violation
                    </p>
                    <p className="text-[10px] text-red-600 leading-relaxed">
                      The selected coordinates fall outside the Cebu City
                      limits. Please adjust the pin to ensure the specialist
                      appears in local search results.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-6 bg-green-50 border border-green-100 p-2.5 rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <p className="text-[10px] font-bold text-green-800 uppercase tracking-wider">
                    Valid Cebu City Coordinates
                  </p>
                </div>
              )}

              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Full Name & Credentials
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedSpecialist?.name}
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors text-gray-900 font-medium"
                    />
                  </div>

                  {/* Clinic Name */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Primary Clinic / Hospital
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedSpecialist?.clinic}
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors text-gray-900 font-medium"
                    />
                  </div>

                  {/* Exact Address */}
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Exact Clinic Address
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedSpecialist?.address}
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors text-gray-900 font-medium"
                    />
                  </div>

                  {/* Coordinates - Latitude */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Latitude
                    </label>
                    <div className="relative">
                      <MapPin
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="number"
                        value={mapCoords.lat}
                        onChange={(e) =>
                          setMapCoords({
                            ...mapCoords,
                            lat: parseFloat(e.target.value),
                          })
                        }
                        className={`w-full pl-7 pr-3 py-2 text-xs bg-[#f8fafc] border rounded-lg focus:outline-none focus:bg-white transition-colors text-gray-900 font-medium font-mono ${!isWithinCebuCity(mapCoords.lat, mapCoords.lng) ? "border-red-300 focus:border-red-500 text-red-600" : "border-gray-200 focus:border-[#1e4ed8]"}`}
                      />
                    </div>
                  </div>

                  {/* Coordinates - Longitude */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Longitude
                    </label>
                    <div className="relative">
                      <MapPin
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="number"
                        value={mapCoords.lng}
                        onChange={(e) =>
                          setMapCoords({
                            ...mapCoords,
                            lng: parseFloat(e.target.value),
                          })
                        }
                        className={`w-full pl-7 pr-3 py-2 text-xs bg-[#f8fafc] border rounded-lg focus:outline-none focus:bg-white transition-colors text-gray-900 font-medium font-mono ${!isWithinCebuCity(mapCoords.lat, mapCoords.lng) ? "border-red-300 focus:border-red-500 text-red-600" : "border-gray-200 focus:border-[#1e4ed8]"}`}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Contact Number
                    </label>
                    <div className="relative">
                      <Phone
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        defaultValue={selectedSpecialist?.phone}
                        className="w-full pl-7 pr-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors text-gray-900 font-medium"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        defaultValue={selectedSpecialist?.email}
                        className="w-full pl-7 pr-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors text-gray-900 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-gray-50">
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!isWithinCebuCity(mapCoords.lat, mapCoords.lng)}
                    className={`flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-sm ${
                      isWithinCebuCity(mapCoords.lat, mapCoords.lng)
                        ? "bg-[#1e4ed8] hover:bg-[#113296] shadow-blue-900/20"
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Specialists;
