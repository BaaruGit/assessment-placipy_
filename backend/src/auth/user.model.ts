// User model interface for type safety
export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    status: string;
    groups: string[];
    department?: string;
    rollNumber?: string;
}

// User creation attributes
export interface UserCreationAttributes {
    username: string;
    email: string;
    password: string;
    role?: string;
}

// User login attributes
export interface UserLoginAttributes {
    username: string;
    password: string;
}

// User profile update attributes
export interface UserProfileUpdateAttributes {
    email?: string;
    rollNumber?: string;
    // Add other updatable fields as needed
}