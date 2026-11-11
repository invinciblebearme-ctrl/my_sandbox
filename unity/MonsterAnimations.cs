using UnityEngine;

// Plays the standard clips baked into every monster GLB:
//   idle, move, attack, hit, death (+ special on some monsters)
//
// Setup: import the .glb with glTFast (Animation Method = Legacy), drag it into
// the scene and add this component to the same GameObject (or any parent).
// Not tested inside Unity by the author of this file: adjust if your project differs.
public class MonsterAnimations : MonoBehaviour
{
    public float crossFade = 0.15f;

    Animation anim;
    string loopClip = "idle";

    void Awake()
    {
        anim = GetComponentInChildren<Animation>();
        if (anim == null)
        {
            Debug.LogWarning($"{name}: no Animation component found (import with Animation Method = Legacy)");
            enabled = false;
            return;
        }
        foreach (AnimationState state in anim)
        {
            state.wrapMode = state.name switch
            {
                "death" => WrapMode.ClampForever, // stay down
                "hit" or "attack" or "special" => WrapMode.Once,
                _ => WrapMode.Loop,
            };
        }
        Idle();
    }

    bool Has(string clip) => anim != null && anim[clip] != null;

    void PlayLoop(string clip)
    {
        if (!Has(clip)) return;
        loopClip = clip;
        anim.CrossFade(clip, crossFade);
    }

    // One-shot clip, then back to the current loop (idle or move).
    void PlayOnce(string clip)
    {
        if (!Has(clip)) return;
        anim.CrossFade(clip, crossFade * 0.5f);
        anim.CrossFadeQueued(loopClip, crossFade);
    }

    public void Idle() => PlayLoop("idle");
    public void Move() => PlayLoop("move");
    public void Attack() => PlayOnce("attack");
    public void Hit() => PlayOnce("hit");
    public void Special() => PlayOnce(Has("special") ? "special" : "attack");
    public void Die() { if (Has("death")) anim.CrossFade("death", crossFade); }
}
