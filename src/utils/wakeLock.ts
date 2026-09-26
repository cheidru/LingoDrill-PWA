// utils/wakeLock.ts
//
// Keep the screen on while a long operation runs.
//
// WHY: on a phone, auto-detect or trim on a long file outlasts the screen
// timeout. Once the screen goes off the browser throttles or freezes the page,
// so the operation stalls until the user wakes the phone — which reads as the
// operation being far slower than it is. Unsupported browsers (and a request
// refused because the page is hidden) simply get no lock.

/** Request a screen wake lock. Resolves to a function that releases it. */
export async function holdScreenAwake(): Promise<() => void> {
  if (!("wakeLock" in navigator)) return () => {}
  try {
    const sentinel = await navigator.wakeLock.request("screen")
    return () => {
      sentinel.release().catch(() => {})
    }
  } catch {
    return () => {}
  }
}
