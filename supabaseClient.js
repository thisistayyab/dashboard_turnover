
(function(){
  const u = (typeof window !== "undefined" && window.__SUPABASE_URL__) || "";
  const k = (typeof window !== "undefined" && window.__SUPABASE_ANON_KEY__) || "";
  if (!u || !k) {
    console.warn("Supabase URL/key not provided. Falling back to localStorage only.");
    window.sb = null;
    window.dispatchEvent(new CustomEvent('supabase:ready', { detail: { ready: false } }));
    return;
  }
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.defer = true;
  script.onload = function(){
    try {
      const client = window.supabase && window.supabase.createClient
        ? window.supabase.createClient(u, k)
        : null;
      window.sb = client;
      window.dispatchEvent(new CustomEvent('supabase:ready', { detail: { ready: !!client } }));
    } catch (e) {
      console.error("Failed to init Supabase client:", e);
      window.sb = null;
      window.dispatchEvent(new CustomEvent('supabase:ready', { detail: { ready: false } }));
    }
  };
  document.head.appendChild(script);
})();

