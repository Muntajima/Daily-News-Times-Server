const { ObjectId } = require('mongodb');

class UserModel {
  constructor(db) {
    this.collection = db.collection('users'); // Reference the 'users' collection
  }

  async findUserById(id) {
    try {
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findUserByEmail(email) {
    try {
      return await this.collection.findOne({ email });
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  async createUser(user) {
    try {
      const result = await this.collection.insertOne(user);
      return result.insertedId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserById(id, updates) {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating user by ID:', error);
      throw error;
    }
  }

  async deleteUserById(id) {
    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting user by ID:', error);
      throw error;
    }
  }
}

module.exports = UserModel;
