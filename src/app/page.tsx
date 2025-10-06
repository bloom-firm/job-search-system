import JobList from './components/JobList'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">求人検索システム</h1>
        </div>
      </header>
      <main>
        <JobList />
      </main>
    </div>
  )
}
