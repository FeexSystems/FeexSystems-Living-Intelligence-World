import { GlobestudioGlobe } from '@/components/GlobestudioGlobe';

export default function GlobestudioDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Globestudio Globe Demo
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Default Look */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">Default Look</h2>
            <GlobestudioGlobe
              look="default"
              config={JSON.stringify({
                v: 3,
                selection: "world",
                dotColor: "#7dd3fc",
                backgroundStyle: "transparent"
              })}
              height={400}
              title="World globe with blue dots"
            />
          </div>

          {/* CRT Look */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">CRT Look</h2>
            <GlobestudioGlobe
              look="crt"
              config={JSON.stringify({
                v: 3,
                selection: "continent:Europe",
                dotColor: "#00ff00"
              })}
              height={400}
              title="Europe globe with CRT effect"
            />
          </div>

          {/* Topographic Look */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">Topographic Look</h2>
            <GlobestudioGlobe
              look="topographic"
              config={JSON.stringify({
                v: 3,
                selection: "country:USA",
                dotColor: "#ff6b6b"
              })}
              height={400}
              title="USA globe with topographic style"
            />
          </div>

          {/* Vapor Look */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">Vapor Look</h2>
            <GlobestudioGlobe
              look="vapor"
              config={JSON.stringify({
                v: 3,
                selection: "continent:Asia",
                dotColor: "#a855f7"
              })}
              height={400}
              title="Asia globe with vaporwave style"
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/70 text-sm">
            Powered by <a href="https://globestudio.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Globestudio</a>
          </p>
        </div>
      </div>
    </div>
  );
}
