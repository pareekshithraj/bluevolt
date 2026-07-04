import Foundation

enum NetworkError: Error {
    case timeout
    case connectionIssue
    case serverError(String)
    case invalidResponse
    case notAuthenticated
}

class NetworkClient {
    static let shared = NetworkClient()
    let baseURL = "https://bluevolt.group"
    
    // MARK: - User Defaults Keys
    private let keyToken = "auth_token"
    private let keyUserName = "user_name"
    private let keyUserEmail = "user_email"
    private let keyUserRole = "user_role"
    private let keyPortalCachePrefix = "portal_cache_"
    
    private let defaults = UserDefaults.standard
    
    private init() {}
    
    // MARK: - Auth State
    func getToken() -> String? { defaults.string(forKey: keyToken) }
    func getUserName() -> String? { defaults.string(forKey: keyUserName) }
    func getUserEmail() -> String? { defaults.string(forKey: keyUserEmail) }
    func getUserRole() -> String? { defaults.string(forKey: keyUserRole) }
    
    func saveToken(token: String, name: String, email: String, role: String) {
        defaults.set(token, forKey: keyToken)
        defaults.set(name, forKey: keyUserName)
        defaults.set(email, forKey: keyUserEmail)
        defaults.set(role, forKey: keyUserRole)
    }
    
    func clearToken() {
        defaults.removeObject(forKey: keyToken)
        defaults.removeObject(forKey: keyUserName)
        defaults.removeObject(forKey: keyUserEmail)
        defaults.removeObject(forKey: keyUserRole)
    }
    
    // MARK: - Cache
    func getCachedPortalData(tab: String) -> String? {
        return defaults.string(forKey: keyPortalCachePrefix + tab)
    }
    
    func saveCachedPortalData(tab: String, dataStr: String) {
        defaults.set(dataStr, forKey: keyPortalCachePrefix + tab)
    }
    
    // MARK: - API Methods
    
    func login(email: String, password: String) async throws -> Bool {
        guard let url = URL(string: "\(baseURL)/api/employee/login") else { throw NetworkError.invalidResponse }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        if httpResponse.statusCode == 200 {
            var token = json?["token"] as? String
            
            // Fallback to cookie
            if token == nil, let cookieHeader = httpResponse.allHeaderFields["Set-Cookie"] as? String {
                if let match = cookieHeader.range(of: "bluevolt_employee_session=([^;]+)", options: .regularExpression) {
                    let fullMatch = String(cookieHeader[match])
                    token = fullMatch.replacingOccurrences(of: "bluevolt_employee_session=", with: "")
                }
            }
            
            if let token = token {
                let user = json?["user"] as? [String: Any]
                let name = user?["name"] as? String ?? ""
                let email = user?["email"] as? String ?? ""
                let role = user?["role"] as? String ?? ""
                saveToken(token: token, name: name, email: email, role: role)
                return true
            }
        }
        
        let errorMsg = json?["error"] as? String ?? "Login failed"
        throw NetworkError.serverError(errorMsg)
    }
    
    func fetchPortalData(tab: String = "dashboard") async throws -> String {
        guard let token = getToken() else { throw NetworkError.notAuthenticated }
        guard let url = URL(string: "\(baseURL)/api/employee/portal?tab=\(tab)") else { throw NetworkError.invalidResponse }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        
        if httpResponse.statusCode == 200 {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let session = json["session"] as? [String: Any] {
                // Update User Info
                if let name = session["name"] as? String { defaults.set(name, forKey: keyUserName) }
                if let email = session["email"] as? String { defaults.set(email, forKey: keyUserEmail) }
                if let role = session["role"] as? String { defaults.set(role, forKey: keyUserRole) }
            }
            return String(data: data, encoding: .utf8) ?? ""
        } else {
            throw NetworkError.serverError("Failed to fetch data: \(httpResponse.statusCode)")
        }
    }
    
    func clockIn() async throws -> Bool {
        return try await simplePost(endpoint: "/api/employee/clock-in")
    }
    
    func clockOut() async throws -> Bool {
        return try await simplePost(endpoint: "/api/employee/clock-out")
    }
    
    private func simplePost(endpoint: String, body: [String: Any]? = nil) async throws -> Bool {
        guard let token = getToken() else { throw NetworkError.notAuthenticated }
        guard let url = URL(string: "\(baseURL)\(endpoint)") else { throw NetworkError.invalidResponse }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        
        if httpResponse.statusCode == 200 { return true }
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        throw NetworkError.serverError(json?["error"] as? String ?? "Request failed: \(httpResponse.statusCode)")
    }
    
    func postOperation(operation: String, payload: [String: Any]) async throws -> Bool {
        return try await simplePost(endpoint: "/api/employee/operation", body: [
            "operation": operation,
            "payload": payload
        ])
    }
}
