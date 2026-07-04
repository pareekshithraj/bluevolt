import SwiftUI

struct HomeView: View {
    @State private var portalData: String = "Loading dashboard..."
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Dashboard")
                    .font(Theme.sassPageTitle)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                
                Text(portalData)
                    .font(.system(size: 12))
                    .padding()
                    .background(Theme.sassCard)
                    .cornerRadius(12)
                    .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .task {
            do {
                portalData = try await NetworkClient.shared.fetchPortalData(tab: "dashboard")
            } catch {
                portalData = "Failed to load dashboard."
            }
        }
    }
}

struct TasksView: View {
    @State private var portalData: String = "Loading tasks..."
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Tasks")
                    .font(Theme.sassPageTitle)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                
                Text(portalData)
                    .font(.system(size: 12))
                    .padding()
                    .background(Theme.sassCard)
                    .cornerRadius(12)
                    .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .task {
            do {
                portalData = try await NetworkClient.shared.fetchPortalData(tab: "tasks")
            } catch {
                portalData = "Failed to load tasks."
            }
        }
    }
}

struct NotificationsView: View {
    @State private var portalData: String = "Loading alerts..."
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Alerts")
                    .font(Theme.sassPageTitle)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                
                Text(portalData)
                    .font(.system(size: 12))
                    .padding()
                    .background(Theme.sassCard)
                    .cornerRadius(12)
                    .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .task {
            do {
                portalData = try await NetworkClient.shared.fetchPortalData(tab: "notifications")
            } catch {
                portalData = "Failed to load alerts."
            }
        }
    }
}

struct ProfileView: View {
    @State private var portalData: String = "Loading profile..."
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Profile")
                    .font(Theme.sassPageTitle)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                
                Text(portalData)
                    .font(.system(size: 12))
                    .padding()
                    .background(Theme.sassCard)
                    .cornerRadius(12)
                    .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .task {
            do {
                portalData = try await NetworkClient.shared.fetchPortalData(tab: "profile")
            } catch {
                portalData = "Failed to load profile."
            }
        }
    }
}

struct MenuView: View {
    var onLogout: () -> Void
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Menu")
                    .font(Theme.sassPageTitle)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                
                Button(action: {
                    NetworkClient.shared.clearToken()
                    onLogout()
                }) {
                    Text("Sign Out")
                        .font(Theme.sassCardTitle)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.sassDanger)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
    }
}
