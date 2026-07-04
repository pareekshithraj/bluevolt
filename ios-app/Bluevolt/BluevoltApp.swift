import SwiftUI

@main
struct BluevoltApp: App {
    @State private var showSplash = true
    @State private var isAuthenticated = NetworkClient.shared.getToken() != nil
    
    var body: some Scene {
        WindowGroup {
            if showSplash {
                SplashView {
                    showSplash = false
                }
            } else {
                if isAuthenticated {
                    PortalView {
                        isAuthenticated = false
                    }
                } else {
                    LoginView {
                        isAuthenticated = true
                    }
                }
            }
        }
    }
}
