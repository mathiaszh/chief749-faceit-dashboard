import unittest
from scripts.sync import normalize, number


class NormalizationTests(unittest.TestCase):
    def test_extracts_only_our_player_and_preserves_missing_stats(self):
        payload = {"rounds": [{"round_stats": {"Map":"de_anubis", "Rounds":"20"}, "teams":[
            {"team_id":"team1", "players":[
                {"player_id":"other", "player_stats":{"Kills":"99"}},
                {"player_id":"chief", "player_stats":{"Kills":"13", "Deaths":"12", "Result":"1"}}
            ]}]}]}
        rows = normalize({"match_id":"m", "finished_at":123}, payload, "chief")
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]["kills"],13)
        self.assertEqual(rows[0]["map"],"anubis")
        self.assertTrue(rows[0]["won"])
        self.assertIsNone(rows[0]["adr"])
        self.assertIsNone(number("NaN"))


if __name__ == '__main__':
    unittest.main()
