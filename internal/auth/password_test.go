package auth

import "testing"

func TestPasswordHashVerify(t *testing.T) {
	h, err := HashPassword("correct horse battery", 4)
	if err != nil {
		t.Fatal(err)
	}
	if !VerifyPassword(h, "correct horse battery") {
		t.Fatal("valid password rejected")
	}
	if VerifyPassword(h, "wrong") {
		t.Fatal("wrong password accepted")
	}
	if VerifyPassword("not-a-hash", "x") {
		t.Fatal("garbage hash accepted")
	}
}

func TestValidatePassword(t *testing.T) {
	if err := ValidatePassword("short"); err == nil {
		t.Fatal("short accepted")
	}
	if err := ValidatePassword("longenough"); err != nil {
		t.Fatal(err)
	}
	if err := ValidatePassword(string(make([]byte, 73))); err == nil {
		t.Fatal("73 bytes accepted")
	}
}

func TestVerifyEmptyHashFails(t *testing.T) {
	if VerifyPassword("", "anything") {
		t.Fatal("empty hash accepted")
	}
}
