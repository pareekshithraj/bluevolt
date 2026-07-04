import SwiftUI

struct LoginView: View {
    var onLoginSuccess: () -> Void
    
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String? = nil
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading) {
                Spacer().frame(height: 48)
                
                Image("logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 60, height: 60)
                
                Spacer().frame(height: 32)
                
                Text("Welcome Back")
                    .font(Theme.sassPageTitle)
                    .foregroundColor(Theme.sassTextPrimary)
                
                Spacer().frame(height: 8)
                
                Text("Manage your organization effortlessly")
                    .font(Theme.sassBodyLarge)
                    .foregroundColor(Theme.sassTextSecondary)
                
                Spacer().frame(height: 40)
                
                VStack(spacing: 20) {
                    PremiumTextField(
                        label: "Email Address",
                        placeholder: "name@company.com",
                        text: $email,
                        iconName: "envelope.fill"
                    )
                    
                    PremiumTextField(
                        label: "Password",
                        placeholder: "••••••••",
                        text: $password,
                        iconName: "lock.fill",
                        isSecure: true
                    )
                    
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.sassDanger)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    
                    Spacer().frame(height: 8)
                    
                    PremiumButton(title: "Sign In", isLoading: isLoading) {
                        guard !email.isEmpty, !password.isEmpty else {
                            errorMessage = "Please enter both email and password."
                            return
                        }
                        isLoading = true
                        errorMessage = nil
                        
                        Task {
                            do {
                                let success = try await NetworkClient.shared.login(email: email, password: password)
                                await MainActor.run {
                                    isLoading = false
                                    if success {
                                        onLoginSuccess()
                                    }
                                }
                            } catch NetworkError.serverError(let msg) {
                                await MainActor.run {
                                    isLoading = false
                                    errorMessage = msg
                                }
                            } catch {
                                await MainActor.run {
                                    isLoading = false
                                    errorMessage = "Authentication failed."
                                }
                            }
                        }
                    }
                }
                .padding(24)
                .background(Theme.sassCard)
                .cornerRadius(32)
                .shadow(color: Theme.sassTextPrimary.opacity(0.08), radius: 20, x: 0, y: 10)
                
                Spacer().frame(height: 32)
                
                Text("Having trouble logging in? Contact your administrator.")
                    .font(Theme.sassBody)
                    .foregroundColor(Theme.sassTextSecondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                
                Spacer().frame(height: 48)
            }
            .padding(.horizontal, 24)
        }
        .background(Theme.sassBackground.ignoresSafeArea())
    }
}

struct PremiumTextField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    let iconName: String
    var isSecure: Bool = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Theme.sassTextPrimary)
            
            HStack(spacing: 12) {
                Image(systemName: iconName)
                    .foregroundColor(Theme.sassTextSecondary)
                    .frame(width: 20)
                
                if isSecure {
                    SecureField(placeholder, text: $text)
                        .font(.system(size: 16))
                        .foregroundColor(Theme.sassTextPrimary)
                        .autocapitalization(.none)
                } else {
                    TextField(placeholder, text: $text)
                        .font(.system(size: 16))
                        .foregroundColor(Theme.sassTextPrimary)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                }
            }
            .padding(.horizontal, 20)
            .frame(height: 60)
            .background(Color(hex: 0xF8FAFC))
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color(hex: 0x0F172A).opacity(0.06), lineWidth: 1)
            )
        }
    }
}

struct PremiumButton: View {
    let title: String
    let isLoading: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [Theme.sassPrimary, Theme.sassSecondary]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .cornerRadius(18)
            .shadow(color: Theme.sassPrimary.opacity(0.25), radius: 12, x: 0, y: 6)
        }
        .disabled(isLoading)
    }
}
