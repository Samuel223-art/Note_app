/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Smart Note Reminder</h1>
        <p className="text-gray-600 mb-8">
          This is a native Android project. The source code has been generated in the file explorer.
        </p>
        
        <div className="space-y-4 text-left bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Project Files Generated:</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Kotlin Source (MainActivity, Room DB, Alarms)
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              XML Layouts (Material Design)
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              AndroidManifest & Gradle Config
            </li>
          </ul>
        </div>

        <div className="mt-8 text-xs text-gray-400">
          Copy the files from the editor into Android Studio to build your APK.
        </div>
      </div>
    </div>
  );
}
