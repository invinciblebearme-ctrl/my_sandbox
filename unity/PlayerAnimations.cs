using System.Collections;
using UnityEngine;

// Plays the player GLB clips (models/player/*.glb) and handles held items.
//
// Clips: idle, walk, run, hit, death, pickup, aimPistol, shootPistol, aimRifle, shootRifle,
//        meleeSwing, meleeHeavy, throw, useHeal, holdLight, useSpecial, walkAimPistol, walkAimRifle,
//        holdStaff, walkStaff, castFireball (wizard + healing staff),
//        martialIdle, palmKangLong, palmFeiLong, palmShenLong (martial hero, see MartialArts.cs)
// Which clips go with which item is in models/items.json (playerHold / playerUse / playerMove);
// copy those values into the PlayerItem component of each item prefab.
//
// Setup: import the player .glb with glTFast (Animation Method = Legacy), add this
// component to it. Call SetSpeed() every frame from your movement code and
// Equip()/Use()/Hit()/Die() from gameplay code. One-shot actions (shoot, swing, throw...)
// play on the upper body only, so the legs keep walking.
// Not tested inside Unity by the author of this file: adjust if your project differs.
public class PlayerAnimations : MonoBehaviour
{
    public float crossFade = 0.15f;
    public float runSpeed = 3f;
    // idle clip when nothing is held (martial hero: "martialIdle")
    public string emptyHandIdle = "idle";

    Animation anim;
    Transform gripR;
    PlayerItem held;
    string holdClip = "idle", useClip = "", moveClip = "walk";
    bool dead;
    float busyUntil; // a full-body clip is playing: SetSpeed waits

    static readonly string[] Loops = { "idle", "walk", "run", "aimPistol", "aimRifle", "holdLight", "walkAimPistol", "walkAimRifle", "holdStaff", "walkStaff", "martialIdle" };
    static readonly string[] Actions = { "shootPistol", "shootRifle", "meleeSwing", "meleeHeavy", "throw", "useHeal", "useSpecial", "castFireball", "hit", "pickup" };

    void Awake()
    {
        anim = GetComponentInChildren<Animation>();
        gripR = FindDeep(transform, "gripR");
        var spine = FindDeep(transform, "spine");
        foreach (var c in Loops) if (anim[c] != null) anim[c].wrapMode = WrapMode.Loop;
        if (anim["death"] != null) anim["death"].wrapMode = WrapMode.ClampForever;
        // upper-body copies of the one-shot actions, mixed on top of the legs
        foreach (var c in Actions)
        {
            if (anim[c] == null) continue;
            anim.AddClip(anim[c].clip, c + "_upper");
            var s = anim[c + "_upper"];
            s.wrapMode = WrapMode.Once;
            s.layer = 1;
            if (spine != null) s.AddMixingTransform(spine, true);
        }
        holdClip = emptyHandIdle;
        anim.Play(anim[holdClip] != null ? holdClip : "idle");
    }

    // Plays a one-shot full-body clip (martial-arts palms use the legs too).
    public void PlayFullBody(string clip)
    {
        if (dead || anim[clip] == null) return;
        anim[clip].wrapMode = WrapMode.Once;
        anim[clip].layer = 0;
        busyUntil = Time.time + anim[clip].length;
        anim.CrossFade(clip, crossFade * 0.5f);
        anim.CrossFadeQueued(holdClip, crossFade);
    }

    // speed in m/s from your character controller
    public void SetSpeed(float speed)
    {
        if (dead || Time.time < busyUntil) return;
        string clip = speed < 0.1f ? holdClip : speed >= runSpeed ? "run" : moveClip;
        if (anim[clip] != null && !anim.IsPlaying(clip)) anim.CrossFade(clip, crossFade);
    }

    public void Equip(PlayerItem item)
    {
        held = item;
        if (gripR != null) item.PickUp(gripR);
        holdClip = string.IsNullOrEmpty(item.playerHold) ? "idle" : item.playerHold;
        useClip = item.playerUse;
        moveClip = string.IsNullOrEmpty(item.playerMove) ? "walk" : item.playerMove;
        PlayAction("pickup");
    }

    public void Use()
    {
        if (string.IsNullOrEmpty(useClip)) return;
        PlayAction(useClip);
        // magic staff: shoot the projectile when the cast animation releases it
        if (held != null && held.projectilePrefab != null && anim[useClip] != null)
            StartCoroutine(Release(held, anim[useClip].length * held.releaseTime));
    }

    IEnumerator Release(PlayerItem item, float delay)
    {
        yield return new WaitForSeconds(delay);
        if (dead || item != held) yield break;
        Vector3 from = item.CastPoint != null ? item.CastPoint.position : transform.position + Vector3.up * 1.5f;
        Vector3 dir = transform.forward;
        dir.y = 0f;
        var go = Instantiate(item.projectilePrefab);
        var ball = go.GetComponent<HealingFireball>();
        if (ball != null) ball.Launch(gameObject, from, dir.normalized);
        else go.transform.SetPositionAndRotation(from, Quaternion.LookRotation(dir.normalized));
    }
    public void Hit() => PlayAction("hit");

    public void Die()
    {
        dead = true;
        anim.CrossFade("death", crossFade);
    }

    void PlayAction(string clip)
    {
        if (dead) return;
        string upper = clip + "_upper";
        if (anim[upper] != null) anim.CrossFade(upper, crossFade * 0.5f);
        else if (anim[clip] != null) anim.CrossFade(clip, crossFade);
    }

    static Transform FindDeep(Transform t, string name)
    {
        if (t.name == name) return t;
        foreach (Transform c in t)
        {
            var r = FindDeep(c, name);
            if (r != null) return r;
        }
        return null;
    }
}
