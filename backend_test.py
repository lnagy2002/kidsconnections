#!/usr/bin/env python3
"""
Brain Connections Backend API Test Suite
Tests all backend endpoints for the Brain Connections game
"""

import requests
import json
import uuid
from datetime import datetime
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

class BrainConnectionsAPITester:
    def __init__(self):
        self.base_url = API_BASE
        self.test_user_id = str(uuid.uuid4())
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        if response_data:
            result['response_data'] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {message}")
        
    def test_health_check(self):
        """Test GET /api/ - Health check endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "timestamp" in data:
                    self.log_test("Health Check", True, "API is running successfully", data)
                    return True
                else:
                    self.log_test("Health Check", False, "Response missing required fields")
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_get_game_levels(self):
        """Test GET /api/games/levels - Get all game levels"""
        try:
            response = self.session.get(f"{self.base_url}/games/levels")
            
            if response.status_code == 200:
                data = response.json()
                expected_levels = ['easy', 'medium', 'hard', 'youth']
                
                # Check if all levels are present
                missing_levels = [level for level in expected_levels if level not in data]
                if missing_levels:
                    self.log_test("Get Game Levels", False, f"Missing levels: {missing_levels}")
                    return False
                
                # Check structure of each level
                for level in expected_levels:
                    level_data = data[level]
                    if not all(key in level_data for key in ['title', 'description', 'games']):
                        self.log_test("Get Game Levels", False, f"Level {level} missing required fields")
                        return False
                    
                    if not isinstance(level_data['games'], list):
                        self.log_test("Get Game Levels", False, f"Level {level} games is not a list")
                        return False
                
                total_games = sum(len(data[level]['games']) for level in expected_levels)
                self.log_test("Get Game Levels", True, f"Retrieved {total_games} games across all levels", 
                            {'total_games': total_games, 'levels': list(data.keys())})
                return True
                
            else:
                self.log_test("Get Game Levels", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Game Levels", False, f"Error: {str(e)}")
            return False
    
    def test_get_level_games(self):
        """Test GET /api/games/level/{level_key} - Get games for specific levels"""
        levels = ['easy', 'medium', 'hard', 'youth']
        all_passed = True
        
        for level in levels:
            try:
                response = self.session.get(f"{self.base_url}/games/level/{level}")
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ['level', 'games', 'title', 'description']
                    
                    if not all(field in data for field in required_fields):
                        self.log_test(f"Get Level Games - {level}", False, "Missing required fields")
                        all_passed = False
                        continue
                    
                    if data['level'] != level:
                        self.log_test(f"Get Level Games - {level}", False, "Level mismatch in response")
                        all_passed = False
                        continue
                    
                    if not isinstance(data['games'], list):
                        self.log_test(f"Get Level Games - {level}", False, "Games field is not a list")
                        all_passed = False
                        continue
                    
                    self.log_test(f"Get Level Games - {level}", True, 
                                f"Retrieved {len(data['games'])} games for {level} level")
                    
                else:
                    self.log_test(f"Get Level Games - {level}", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Get Level Games - {level}", False, f"Error: {str(e)}")
                all_passed = False
        
        # Test invalid level
        try:
            response = self.session.get(f"{self.base_url}/games/level/invalid")
            if response.status_code == 400:
                self.log_test("Get Level Games - Invalid Level", True, "Correctly rejected invalid level")
            else:
                self.log_test("Get Level Games - Invalid Level", False, 
                            f"Should return 400 for invalid level, got {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_test("Get Level Games - Invalid Level", False, f"Error: {str(e)}")
            all_passed = False
        
        return all_passed
    
    def test_get_specific_game(self):
        """Test GET /api/games/{game_id} - Get specific game data"""
        # First get a game ID from the levels endpoint
        try:
            response = self.session.get(f"{self.base_url}/games/levels")
            if response.status_code != 200:
                self.log_test("Get Specific Game - Setup", False, "Could not get game levels for setup")
                return False
            
            data = response.json()
            # Get first game from easy level
            if 'easy' in data and data['easy']['games']:
                test_game = data['easy']['games'][0]
                game_id = test_game['id']
                
                # Test getting this specific game
                game_response = self.session.get(f"{self.base_url}/games/{game_id}")
                
                if game_response.status_code == 200:
                    game_data = game_response.json()
                    
                    # Verify game structure
                    required_fields = ['id', 'level', 'title', 'words', 'groups']
                    if not all(field in game_data for field in required_fields):
                        self.log_test("Get Specific Game", False, "Missing required fields in game data")
                        return False
                    
                    if game_data['id'] != game_id:
                        self.log_test("Get Specific Game", False, "Game ID mismatch")
                        return False
                    
                    if len(game_data['words']) != 16:
                        self.log_test("Get Specific Game", False, f"Expected 16 words, got {len(game_data['words'])}")
                        return False
                    
                    if len(game_data['groups']) != 4:
                        self.log_test("Get Specific Game", False, f"Expected 4 groups, got {len(game_data['groups'])}")
                        return False
                    
                    self.log_test("Get Specific Game", True, f"Successfully retrieved game: {game_data['title']}")
                    
                    # Test invalid game ID
                    invalid_response = self.session.get(f"{self.base_url}/games/invalid-id")
                    if invalid_response.status_code == 404:
                        self.log_test("Get Specific Game - Invalid ID", True, "Correctly returned 404 for invalid game ID")
                        return True
                    else:
                        self.log_test("Get Specific Game - Invalid ID", False, 
                                    f"Should return 404 for invalid ID, got {invalid_response.status_code}")
                        return False
                        
                else:
                    self.log_test("Get Specific Game", False, 
                                f"HTTP {game_response.status_code}: {game_response.text}")
                    return False
            else:
                self.log_test("Get Specific Game - Setup", False, "No games found in easy level")
                return False
                
        except Exception as e:
            self.log_test("Get Specific Game", False, f"Error: {str(e)}")
            return False
    
    def test_get_daily_games(self):
        """Test GET /api/games/daily/{level} - Get daily challenges"""
        levels = ['easy', 'medium', 'hard', 'youth']
        all_passed = True
        
        for level in levels:
            try:
                response = self.session.get(f"{self.base_url}/games/daily/{level}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check daily game structure
                    required_fields = ['id', 'level', 'title', 'words', 'groups', 'isDaily', 'dailyDate']
                    if not all(field in data for field in required_fields):
                        self.log_test(f"Get Daily Game - {level}", False, "Missing required fields")
                        all_passed = False
                        continue
                    
                    if not data['isDaily']:
                        self.log_test(f"Get Daily Game - {level}", False, "isDaily should be True")
                        all_passed = False
                        continue
                    
                    if data['level'] != level:
                        self.log_test(f"Get Daily Game - {level}", False, "Level mismatch")
                        all_passed = False
                        continue
                    
                    # Check if dailyDate is today
                    today = datetime.utcnow().strftime('%Y-%m-%d')
                    if data['dailyDate'] != today:
                        self.log_test(f"Get Daily Game - {level}", False, 
                                    f"Daily date should be {today}, got {data['dailyDate']}")
                        all_passed = False
                        continue
                    
                    self.log_test(f"Get Daily Game - {level}", True, 
                                f"Retrieved daily game: {data['title']}")
                    
                elif response.status_code == 404:
                    self.log_test(f"Get Daily Game - {level}", False, 
                                f"No daily game available for {level} level")
                    all_passed = False
                else:
                    self.log_test(f"Get Daily Game - {level}", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Get Daily Game - {level}", False, f"Error: {str(e)}")
                all_passed = False
        
        # Test invalid level
        try:
            response = self.session.get(f"{self.base_url}/games/daily/invalid")
            if response.status_code == 400:
                self.log_test("Get Daily Game - Invalid Level", True, "Correctly rejected invalid level")
            else:
                self.log_test("Get Daily Game - Invalid Level", False, 
                            f"Should return 400 for invalid level, got {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_test("Get Daily Game - Invalid Level", False, f"Error: {str(e)}")
            all_passed = False
        
        return all_passed
    
    def test_user_progress(self):
        """Test GET /api/progress - Get user progress"""
        try:
            headers = {'X-User-Id': self.test_user_id}
            response = self.session.get(f"{self.base_url}/progress", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check progress structure
                required_fields = ['userId', 'easy', 'medium', 'hard', 'youth', 'daily']
                if not all(field in data for field in required_fields):
                    self.log_test("Get User Progress", False, "Missing required fields in progress")
                    return False
                
                if data['userId'] != self.test_user_id:
                    self.log_test("Get User Progress", False, "User ID mismatch")
                    return False
                
                # Check level progress structure
                for level in ['easy', 'medium', 'hard', 'youth']:
                    level_progress = data[level]
                    if not all(field in level_progress for field in ['completedGames', 'perfectGames', 'games']):
                        self.log_test("Get User Progress", False, f"Missing fields in {level} progress")
                        return False
                
                # Check daily progress structure
                daily_progress = data['daily']
                for level in ['easy', 'medium', 'hard', 'youth']:
                    if level not in daily_progress:
                        self.log_test("Get User Progress", False, f"Missing {level} in daily progress")
                        return False
                
                self.log_test("Get User Progress", True, "Successfully retrieved user progress")
                return True
                
            else:
                self.log_test("Get User Progress", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get User Progress", False, f"Error: {str(e)}")
            return False
    
    def test_complete_game(self):
        """Test POST /api/progress/game - Update game completion"""
        try:
            # First get a game to complete
            response = self.session.get(f"{self.base_url}/games/levels")
            if response.status_code != 200:
                self.log_test("Complete Game - Setup", False, "Could not get game levels")
                return False
            
            data = response.json()
            if 'easy' not in data or not data['easy']['games']:
                self.log_test("Complete Game - Setup", False, "No easy games available")
                return False
            
            test_game = data['easy']['games'][0]
            game_id = test_game['id']
            
            # Complete the game
            completion_data = {
                "gameId": game_id,
                "mistakes": 2,
                "hintsUsed": 1,
                "timeSeconds": 120
            }
            
            headers = {'X-User-Id': self.test_user_id, 'Content-Type': 'application/json'}
            response = self.session.post(f"{self.base_url}/progress/game", 
                                       json=completion_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if not result.get('success'):
                    self.log_test("Complete Game", False, "Success field is False")
                    return False
                
                if 'progress' not in result:
                    self.log_test("Complete Game", False, "Missing progress in response")
                    return False
                
                # Verify the game was marked as completed
                progress = result['progress']
                if game_id not in progress['easy']['games']:
                    self.log_test("Complete Game", False, "Game not found in progress")
                    return False
                
                game_progress = progress['easy']['games'][game_id]
                if not game_progress.get('completed'):
                    self.log_test("Complete Game", False, "Game not marked as completed")
                    return False
                
                self.log_test("Complete Game", True, "Successfully completed game and updated progress")
                
                # Test with invalid game ID
                invalid_data = {
                    "gameId": "invalid-game-id",
                    "mistakes": 0,
                    "hintsUsed": 0,
                    "timeSeconds": 90
                }
                
                invalid_response = self.session.post(f"{self.base_url}/progress/game", 
                                                   json=invalid_data, headers=headers)
                
                if invalid_response.status_code == 404:
                    self.log_test("Complete Game - Invalid ID", True, "Correctly rejected invalid game ID")
                    return True
                else:
                    self.log_test("Complete Game - Invalid ID", False, 
                                f"Should return 404 for invalid game ID, got {invalid_response.status_code}")
                    return False
                
            else:
                self.log_test("Complete Game", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Complete Game", False, f"Error: {str(e)}")
            return False
    
    def test_complete_daily_game(self):
        """Test POST /api/progress/daily - Update daily challenge completion"""
        try:
            # Get a daily game first
            response = self.session.get(f"{self.base_url}/games/daily/easy")
            if response.status_code != 200:
                self.log_test("Complete Daily Game - Setup", False, "Could not get daily game")
                return False
            
            daily_game = response.json()
            game_id = daily_game['id']
            
            # Complete the daily game
            completion_data = {
                "gameId": game_id,
                "level": "easy",
                "mistakes": 0,
                "hintsUsed": 0,
                "timeSeconds": 95
            }
            
            headers = {'X-User-Id': self.test_user_id, 'Content-Type': 'application/json'}
            response = self.session.post(f"{self.base_url}/progress/daily", 
                                       json=completion_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if not result.get('success'):
                    self.log_test("Complete Daily Game", False, "Success field is False")
                    return False
                
                if 'progress' not in result:
                    self.log_test("Complete Daily Game", False, "Missing progress in response")
                    return False
                
                # Verify daily progress was updated
                progress = result['progress']
                daily_progress = progress['daily']['easy']
                
                if not daily_progress.get('completedToday'):
                    self.log_test("Complete Daily Game", False, "completedToday not set to True")
                    return False
                
                if daily_progress.get('totalCompleted', 0) == 0:
                    self.log_test("Complete Daily Game", False, "totalCompleted not incremented")
                    return False
                
                self.log_test("Complete Daily Game", True, "Successfully completed daily game")
                
                # Test with invalid level
                invalid_data = {
                    "gameId": game_id,
                    "level": "invalid",
                    "mistakes": 0,
                    "hintsUsed": 0,
                    "timeSeconds": 95
                }
                
                invalid_response = self.session.post(f"{self.base_url}/progress/daily", 
                                                   json=invalid_data, headers=headers)
                
                if invalid_response.status_code == 400:
                    self.log_test("Complete Daily Game - Invalid Level", True, "Correctly rejected invalid level")
                    return True
                else:
                    self.log_test("Complete Daily Game - Invalid Level", False, 
                                f"Should return 400 for invalid level, got {invalid_response.status_code}")
                    return False
                
            else:
                self.log_test("Complete Daily Game", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Complete Daily Game", False, f"Error: {str(e)}")
            return False
    
    def test_user_statistics(self):
        """Test GET /api/stats/user - Get user statistics"""
        try:
            headers = {'X-User-Id': self.test_user_id}
            response = self.session.get(f"{self.base_url}/stats/user", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check stats structure
                required_fields = ['totalGamesCompleted', 'totalPerfectGames', 'totalDailyCompleted', 
                                 'longestDailyStreak', 'favoriteLevel']
                
                if not all(field in data for field in required_fields):
                    self.log_test("Get User Statistics", False, "Missing required fields in stats")
                    return False
                
                # Verify data types
                numeric_fields = ['totalGamesCompleted', 'totalPerfectGames', 'totalDailyCompleted', 'longestDailyStreak']
                for field in numeric_fields:
                    if not isinstance(data[field], int):
                        self.log_test("Get User Statistics", False, f"{field} should be an integer")
                        return False
                
                if data['favoriteLevel'] not in ['easy', 'medium', 'hard', 'youth']:
                    self.log_test("Get User Statistics", False, "Invalid favoriteLevel")
                    return False
                
                # Since we completed games in previous tests, verify some stats
                if data['totalGamesCompleted'] == 0:
                    self.log_test("Get User Statistics", False, "totalGamesCompleted should be > 0 after completing games")
                    return False
                
                if data['totalDailyCompleted'] == 0:
                    self.log_test("Get User Statistics", False, "totalDailyCompleted should be > 0 after completing daily game")
                    return False
                
                self.log_test("Get User Statistics", True, 
                            f"Retrieved stats: {data['totalGamesCompleted']} games, {data['totalDailyCompleted']} daily")
                return True
                
            else:
                self.log_test("Get User Statistics", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get User Statistics", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"\n🧠 Brain Connections API Test Suite")
        print(f"Testing API at: {self.base_url}")
        print(f"Test User ID: {self.test_user_id}")
        print("=" * 60)
        
        # Run tests in logical order
        tests = [
            ("Health Check", self.test_health_check),
            ("Game Levels", self.test_get_game_levels),
            ("Level Games", self.test_get_level_games),
            ("Specific Game", self.test_get_specific_game),
            ("Daily Games", self.test_get_daily_games),
            ("User Progress", self.test_user_progress),
            ("Complete Game", self.test_complete_game),
            ("Complete Daily Game", self.test_complete_daily_game),
            ("User Statistics", self.test_user_statistics)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n--- Testing {test_name} ---")
            if test_func():
                passed += 1
            time.sleep(0.5)  # Small delay between tests
        
        print("\n" + "=" * 60)
        print(f"🏆 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Brain Connections API is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Check the details above.")
        
        return passed == total
    
    def get_summary(self):
        """Get test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            'all_passed': failed_tests == 0
        }

def main():
    """Main test execution"""
    print("Starting Brain Connections Backend API Tests...")
    
    tester = BrainConnectionsAPITester()
    success = tester.run_all_tests()
    
    summary = tester.get_summary()
    print(f"\n📊 Final Summary:")
    print(f"   Total Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed_tests']}")
    print(f"   Failed: {summary['failed_tests']}")
    print(f"   Success Rate: {summary['success_rate']:.1f}%")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)