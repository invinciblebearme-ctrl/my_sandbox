using UnityEngine;

// Healing fireball projectile (models/magic/healingFireball.glb).
// Clips: fly (loop), charge, impact.
//
// It flies straight forward. When it hits a monster or the ground it bursts:
//   - monsters (tag "Monster") inside `radius` get TakeDamage(damage)
//   - players  (tag "Player")  inside `radius` get Heal(heal), the caster too if healCaster
// Both are sent with SendMessage, so add a `void TakeDamage(float)` / `void Heal(float)`
// method to your own monster / player health scripts.
//
// Setup: import the .glb with glTFast (Animation Method = Legacy), add this component,
// save it as a prefab and put it in the staff's PlayerItem.projectilePrefab.
// PlayerAnimations spawns it at the staff's `castPoint` when castFireball releases.
// Not tested inside Unity by the author of this file: adjust if your project differs.
public class HealingFireball : MonoBehaviour
{
    public float speed = 9f;
    public float lifetime = 3f;
    public float damage = 25f;
    public float heal = 15f;
    public float radius = 2.5f;
    public bool healCaster = true;
    public string monsterTag = "Monster";
    public string playerTag = "Player";

    [HideInInspector] public GameObject caster;

    Animation anim;
    bool exploded;
    float age;

    void Awake()
    {
        anim = GetComponentInChildren<Animation>();
        var col = gameObject.AddComponent<SphereCollider>();
        col.isTrigger = true;
        col.radius = 0.25f;
        col.center = new Vector3(0f, 0.5f, 0f); // the ball sits 0.5 above the root in the GLB
        var body = gameObject.AddComponent<Rigidbody>();
        body.isKinematic = true;
        body.useGravity = false;
        if (anim != null && anim["fly"] != null)
        {
            anim["fly"].wrapMode = WrapMode.Loop;
            anim.Play("fly");
        }
    }

    // Called by PlayerAnimations right after spawning.
    public void Launch(GameObject from, Vector3 position, Vector3 direction)
    {
        caster = from;
        // the GLB root is 0.5 below the ball: spawn so the ball is at `position`
        transform.SetPositionAndRotation(position - Vector3.up * 0.5f, Quaternion.LookRotation(direction, Vector3.up));
    }

    void Update()
    {
        if (exploded) return;
        transform.position += transform.forward * speed * Time.deltaTime;
        age += Time.deltaTime;
        if (age > lifetime) Explode();
    }

    void OnTriggerEnter(Collider other)
    {
        if (exploded || other.isTrigger) return;
        if (caster != null && other.transform.IsChildOf(caster.transform)) return;
        Explode();
    }

    void Explode()
    {
        exploded = true;
        Vector3 center = transform.position + Vector3.up * 0.5f;
        var healed = new System.Collections.Generic.HashSet<GameObject>();
        foreach (var c in Physics.OverlapSphere(center, radius))
        {
            var target = c.attachedRigidbody != null ? c.attachedRigidbody.gameObject : c.gameObject;
            if (!healed.Add(target)) continue;
            if (target.CompareTag(monsterTag))
                target.SendMessage("TakeDamage", damage, SendMessageOptions.DontRequireReceiver);
            else if (target.CompareTag(playerTag) && (healCaster || target != caster))
                target.SendMessage("Heal", heal, SendMessageOptions.DontRequireReceiver);
        }
        float wait = 0.8f;
        if (anim != null && anim["impact"] != null)
        {
            anim["impact"].wrapMode = WrapMode.ClampForever;
            anim.CrossFade("impact", 0.05f);
            wait = anim["impact"].length;
        }
        Destroy(gameObject, wait);
    }
}
