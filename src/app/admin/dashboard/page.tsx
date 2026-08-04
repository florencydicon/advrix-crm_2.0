export default function AdminDashboard() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Super Admin Dashboard</h1>
        <p className="text-gray-500 mt-1 font-medium">Welcome back! Here's the overview of your agency.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Clients</h3>
          <p className="text-4xl font-extrabold text-gray-900 mt-2">12</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Active Projects</h3>
          <p className="text-4xl font-extrabold text-primary mt-2">8</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Pending Tasks</h3>
          <p className="text-4xl font-extrabold text-warning-text mt-2">24</p>
        </div>
      </div>

      {/* Recent Activity Section (Placeholder) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-64 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900">Recent Agency Activity</h3>
        <p className="text-gray-500 max-w-sm mt-2">Activity charts and recent task completions will appear here once the database has active project data.</p>
      </div>

    </div>
  );
}